-- Vários super admins de plataforma (atribuíveis no banco) + gestão de equipe na clínica.

-- ---------------------------------------------------------------------------
-- Antes: no máximo um platform_super_admin (índice único parcial).
-- Agora: vários usuários podem ter role = platform_super_admin (tenant_id null),
-- promovidos via SQL ou por outro super admin (políticas já existentes).
-- ---------------------------------------------------------------------------

drop index if exists clinic.clinic_profiles_one_platform_super_admin;

-- ---------------------------------------------------------------------------
-- Gestor da clínica: owner ou clinic_admin (criar/gerir agentes no tenant).
-- ---------------------------------------------------------------------------

create or replace function clinic.is_tenant_manager()
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
      and p.tenant_id is not null
      and p.role in ('owner', 'clinic_admin')
  );
$$;

grant execute on function clinic.is_tenant_manager() to authenticated;

comment on function clinic.is_tenant_manager() is
  'True se o usuário é owner ou clinic_admin do próprio tenant.';

-- ---------------------------------------------------------------------------
-- Impede troca de próprio papel pelo app (exceto super admin de plataforma).
-- ---------------------------------------------------------------------------

create or replace function clinic.profiles_enforce_self_role_immutable()
returns trigger
language plpgsql
security definer
set search_path = clinic, public
as $$
begin
  if TG_OP = 'UPDATE'
     and NEW.id = OLD.id
     and NEW.id = auth.uid()
     and NEW.role is distinct from OLD.role
  then
    if exists (
      select 1
      from clinic.profiles p
      where p.id = auth.uid()
        and p.role = 'platform_super_admin'
        and p.tenant_id is null
    ) then
      return NEW;
    end if;
    raise exception 'Alteração do próprio papel não é permitida por este canal';
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_enforce_self_role on clinic.profiles;

create trigger profiles_enforce_self_role
  before update on clinic.profiles
  for each row
  execute function clinic.profiles_enforce_self_role_immutable();

-- ---------------------------------------------------------------------------
-- RLS: gestores podem atualizar perfis do mesmo tenant (equipe).
-- ---------------------------------------------------------------------------

create policy profiles_update_tenant_manager
  on clinic.profiles
  for update
  to authenticated
  using (
    clinic.is_tenant_manager()
    and tenant_id is not null
    and tenant_id = clinic.user_tenant_id()
  )
  with check (
    clinic.is_tenant_manager()
    and tenant_id = clinic.user_tenant_id()
    and tenant_id is not null
    and role not in ('platform_super_admin', 'pending_registration')
  );
