-- Papéis de plataforma e RLS para super admin (primeiro cadastro controlado no trigger).
-- Roles: platform_super_admin (único), pending_registration, owner, clinic_admin, agent.

-- ---------------------------------------------------------------------------
-- Garantir no máximo um super admin de plataforma
-- ---------------------------------------------------------------------------

create unique index if not exists clinic_profiles_one_platform_super_admin
  on clinic.profiles (role)
  where role = 'platform_super_admin';

-- ---------------------------------------------------------------------------
-- Auth: primeiro usuário vira platform_super_admin; demais pending_registration
-- (com lock para reduzir corrida em signups simultâneos)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, clinic
as $$
declare
  is_first boolean;
begin
  perform pg_advisory_xact_lock(82736401);

  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  select not exists (
    select 1 from clinic.profiles p where p.role = 'platform_super_admin'
  )
  into is_first;

  -- tenant_id nunca vem do metadata público do signUp (evita vínculo arbitrário a tenant).
  insert into clinic.profiles (id, full_name, tenant_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    null,
    case
      when is_first then 'platform_super_admin'
      else 'pending_registration'
    end
  )
  on conflict (id) do update set
    full_name = excluded.full_name;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Função pública: estado do bootstrap (anon pode ler para exibir/ocultar cadastro)
-- ---------------------------------------------------------------------------

create or replace function public.clinic_bootstrap_status()
returns jsonb
language sql
stable
security definer
set search_path = public, clinic
as $$
  select jsonb_build_object(
    'has_platform_super_admin',
    exists (select 1 from clinic.profiles p where p.role = 'platform_super_admin'),
    'signup_open',
    not exists (select 1 from clinic.profiles p where p.role = 'platform_super_admin')
  );
$$;

grant execute on function public.clinic_bootstrap_status() to anon, authenticated;

comment on function public.clinic_bootstrap_status() is
  'has_platform_super_admin: já existe super admin; signup_open: ainda permite primeiro cadastro.';

-- ---------------------------------------------------------------------------
-- Helpers (RLS)
-- ---------------------------------------------------------------------------

create or replace function clinic.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = clinic, public
as $$
  select exists (
    select 1
    from clinic.profiles p
    where p.id = auth.uid()
      and p.role = 'platform_super_admin'
      and p.tenant_id is null
  );
$$;

grant execute on function clinic.is_platform_super_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: tenants — super admin de plataforma
-- ---------------------------------------------------------------------------

create policy tenants_select_platform_super
  on clinic.tenants
  for select
  to authenticated
  using (clinic.is_platform_super_admin());

create policy tenants_insert_platform_super
  on clinic.tenants
  for insert
  to authenticated
  with check (clinic.is_platform_super_admin());

create policy tenants_update_platform_super
  on clinic.tenants
  for update
  to authenticated
  using (clinic.is_platform_super_admin())
  with check (clinic.is_platform_super_admin());

-- ---------------------------------------------------------------------------
-- RLS: profiles — super admin pode ver e atualizar perfis (convites / vínculo)
-- ---------------------------------------------------------------------------

create policy profiles_select_platform_super
  on clinic.profiles
  for select
  to authenticated
  using (clinic.is_platform_super_admin());

create policy profiles_update_platform_super
  on clinic.profiles
  for update
  to authenticated
  using (clinic.is_platform_super_admin())
  with check (clinic.is_platform_super_admin());
