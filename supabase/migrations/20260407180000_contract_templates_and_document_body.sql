-- Modelos de contrato por tenant (editor ou arquivo) e documentos só em HTML na ficha.

create table clinic.contract_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  title text not null,
  body_html text,
  storage_key text,
  mime_type text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_templates_content_chk check (
    (storage_key is not null and length(trim(storage_key)) > 0)
    or (body_html is not null and length(trim(body_html)) > 0)
  )
);

create index contract_templates_tenant_id_idx
  on clinic.contract_templates (tenant_id);

create unique index contract_templates_one_default_per_tenant
  on clinic.contract_templates (tenant_id)
  where is_default;

create trigger contract_templates_set_updated_at
  before update on clinic.contract_templates
  for each row execute function clinic.set_updated_at();

alter table clinic.documents
  add column if not exists body_html text,
  add column if not exists source_template_id uuid references clinic.contract_templates (id) on delete set null;

alter table clinic.documents alter column storage_key drop not null;

alter table clinic.documents drop constraint if exists documents_storage_or_body_chk;

alter table clinic.documents
  add constraint documents_storage_or_body_chk check (
    (storage_key is not null and length(trim(storage_key)) > 0)
    or (body_html is not null and length(trim(body_html)) > 0)
  );

comment on table clinic.contract_templates is
  'Modelo de contrato da clínica: texto rico (body_html) ou arquivo em storage (PDF/imagem).';
comment on column clinic.documents.body_html is
  'Contrato/termo gerado no sistema (HTML). Mutuamente exclusivo com arquivo em storage_key.';

alter table clinic.contract_templates enable row level security;

create policy contract_templates_tenant_isolation
  on clinic.contract_templates for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.contract_templates to authenticated, service_role;
