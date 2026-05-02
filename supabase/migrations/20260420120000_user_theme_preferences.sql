-- Preferências de tema por usuário e default por clínica.
--
-- - `clinic.profiles.theme_accent_preset` e `theme_mode`: override do próprio
--   usuário (ambos NULL = herda do default da clínica).
-- - `clinic.clinic_theme_settings`: default por tenant, editável por owner /
--   clinic_admin. Qualquer membro do tenant pode ler (precisa para renderizar).

-- Presets de destaque permitidos neste release. Mantidos como CHECK para evitar
-- enums por enquanto (menor fricção para expansão sem migração adicional).
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'clinic'
      and table_name = 'profiles'
      and column_name = 'theme_accent_preset'
  ) then
    alter table clinic.profiles
      add column theme_accent_preset text null,
      add column theme_mode text null;

    alter table clinic.profiles
      add constraint profiles_theme_accent_preset_check
        check (
          theme_accent_preset is null
          or theme_accent_preset in (
            'salvia',
            'indigo',
            'azul',
            'roxo',
            'rosa',
            'laranja',
            'verde-agua',
            'grafite'
          )
        ),
      add constraint profiles_theme_mode_check
        check (
          theme_mode is null
          or theme_mode in ('light', 'dark', 'system')
        );

    comment on column clinic.profiles.theme_accent_preset is
      'Override da paleta de destaque do usuário (NULL = usa default do tenant).';
    comment on column clinic.profiles.theme_mode is
      'Override do modo claro/escuro do usuário (NULL = usa default do tenant).';
  end if;
end $$;

create table if not exists clinic.clinic_theme_settings (
  tenant_id uuid primary key references clinic.tenants(id) on delete cascade,
  default_accent_preset text not null default 'salvia'
    check (default_accent_preset in (
      'salvia',
      'indigo',
      'azul',
      'roxo',
      'rosa',
      'laranja',
      'verde-agua',
      'grafite'
    )),
  default_mode text not null default 'light'
    check (default_mode in ('light', 'dark', 'system')),
  updated_at timestamptz not null default now(),
  updated_by_profile_id uuid references clinic.profiles(id)
);

comment on table clinic.clinic_theme_settings is
  'Default de tema (paleta e modo) por clínica; usuários podem sobrescrever em profiles.';

alter table clinic.clinic_theme_settings enable row level security;

-- SELECT: qualquer membro autenticado do tenant pode ler o default da clínica.
drop policy if exists clinic_theme_settings_select on clinic.clinic_theme_settings;
create policy clinic_theme_settings_select on clinic.clinic_theme_settings
  for select
  to authenticated
  using (
    tenant_id in (
      select p.tenant_id from clinic.profiles p
      where p.id = auth.uid() and p.tenant_id is not null
    )
  );

-- INSERT / UPDATE / DELETE: somente owner / clinic_admin do próprio tenant.
drop policy if exists clinic_theme_settings_manage on clinic.clinic_theme_settings;
create policy clinic_theme_settings_manage on clinic.clinic_theme_settings
  for all
  to authenticated
  using (
    clinic.is_tenant_manager()
    and tenant_id in (
      select p.tenant_id from clinic.profiles p
      where p.id = auth.uid() and p.tenant_id is not null
    )
  )
  with check (
    clinic.is_tenant_manager()
    and tenant_id in (
      select p.tenant_id from clinic.profiles p
      where p.id = auth.uid() and p.tenant_id is not null
    )
  );

-- Trigger simples para `updated_at`. `search_path` fixo para evitar o lint
-- `function_search_path_mutable` do Supabase advisors.
create or replace function clinic.clinic_theme_settings_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = clinic, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists clinic_theme_settings_touch on clinic.clinic_theme_settings;
create trigger clinic_theme_settings_touch
  before update on clinic.clinic_theme_settings
  for each row execute function clinic.clinic_theme_settings_touch_updated_at();
