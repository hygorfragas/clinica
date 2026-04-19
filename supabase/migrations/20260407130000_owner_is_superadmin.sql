-- Regra de produto: `owner` sem tenant_id é Superadmin (área /plataforma).
-- Mantém compatibilidade com o papel legado `platform_super_admin`.

-- ---------------------------------------------------------------------------
-- Bootstrap: primeiro cadastro vira superadmin (owner, tenant_id null)
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
    select 1
    from clinic.profiles p
    where p.tenant_id is null
      and p.role in ('owner', 'platform_super_admin')
  )
  into is_first;

  -- tenant_id nunca vem do metadata público do signUp (evita vínculo arbitrário a tenant).
  insert into clinic.profiles (id, full_name, tenant_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    null,
    case
      when is_first then 'owner'
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
    exists (
      select 1
      from clinic.profiles p
      where p.tenant_id is null
        and p.role in ('owner', 'platform_super_admin')
    ),
    'signup_open',
    not exists (
      select 1
      from clinic.profiles p
      where p.tenant_id is null
        and p.role in ('owner', 'platform_super_admin')
    )
  );
$$;

grant execute on function public.clinic_bootstrap_status() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers (RLS): superadmin global (owner sem tenant) ou legado
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
      and p.tenant_id is null
      and p.role in ('owner', 'platform_super_admin')
  );
$$;

grant execute on function clinic.is_platform_super_admin() to authenticated;

