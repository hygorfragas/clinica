-- Branding de documentos por clínica: imagens (header/footer/logo) e perfis nomeados
-- que definem o layout aplicado no PDF gerado pelo sistema (orçamento por enquanto).

create table clinic.branding_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  kind text not null check (kind in ('header', 'footer', 'logo')),
  label text,
  storage_key text not null,
  mime_type text not null,
  width_px integer,
  height_px integer,
  file_size integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index branding_assets_tenant_id_idx
  on clinic.branding_assets (tenant_id);

create index branding_assets_tenant_kind_idx
  on clinic.branding_assets (tenant_id, kind);

create trigger branding_assets_set_updated_at
  before update on clinic.branding_assets
  for each row execute function clinic.set_updated_at();

comment on table clinic.branding_assets is
  'Imagens de marca da clínica (header, footer, logo) usadas para compor documentos gerados.';
comment on column clinic.branding_assets.storage_key is
  'Caminho no bucket clinical. Formato: {tenant_id}/branding/{kind}/{uuid}.{ext}.';

alter table clinic.branding_assets enable row level security;

create policy branding_assets_tenant_isolation
  on clinic.branding_assets for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.branding_assets to authenticated, service_role;


create table clinic.document_branding_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  show_header boolean not null default true,
  show_footer boolean not null default true,
  show_logo boolean not null default false,
  header_asset_id uuid references clinic.branding_assets (id) on delete set null,
  footer_asset_id uuid references clinic.branding_assets (id) on delete set null,
  logo_asset_id uuid references clinic.branding_assets (id) on delete set null,
  logo_position text not null default 'top-left'
    check (logo_position in (
      'top-left', 'top-center', 'top-right',
      'below-header-left', 'below-header-center'
    )),
  logo_scale_pct integer not null default 30
    check (logo_scale_pct between 10 and 100),
  header_height_mm integer not null default 30
    check (header_height_mm between 5 and 80),
  footer_height_mm integer not null default 20
    check (footer_height_mm between 5 and 60),
  margin_top_mm integer not null default 15
    check (margin_top_mm between 0 and 60),
  margin_right_mm integer not null default 15
    check (margin_right_mm between 0 and 60),
  margin_bottom_mm integer not null default 15
    check (margin_bottom_mm between 0 and 60),
  margin_left_mm integer not null default 15
    check (margin_left_mm between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index document_branding_profiles_tenant_id_idx
  on clinic.document_branding_profiles (tenant_id);

create unique index document_branding_profiles_one_default_per_tenant
  on clinic.document_branding_profiles (tenant_id)
  where is_default;

create trigger document_branding_profiles_set_updated_at
  before update on clinic.document_branding_profiles
  for each row execute function clinic.set_updated_at();

comment on table clinic.document_branding_profiles is
  'Perfis nomeados de branding de documento da clínica. Cada perfil escolhe quais peças aparecem no PDF e quais imagens usar.';

alter table clinic.document_branding_profiles enable row level security;

create policy document_branding_profiles_tenant_isolation
  on clinic.document_branding_profiles for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.document_branding_profiles to authenticated, service_role;
