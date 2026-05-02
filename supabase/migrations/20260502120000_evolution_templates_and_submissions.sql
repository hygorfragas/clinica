-- Templates de Evolução em PDF (upload pela clínica) e submissões por paciente
-- com dados estruturados + camada de tinta. Espelha o pipeline de Anamnese.
--
-- Caminhos no bucket clinical:
--   {tenant_id}/evolution-templates/{template_id}.pdf
--   {tenant_id}/{client_id}/evolution/{submission_id}.pdf

-- ============================================================================
-- Templates
-- ============================================================================

create table if not exists clinic.evolution_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  description text,
  pdf_storage_path text not null,
  page_count integer not null default 1,
  form_schema jsonb not null default '[]'::jsonb,
  ink_regions jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evolution_templates_tenant_idx
  on clinic.evolution_templates (tenant_id);
create index if not exists evolution_templates_tenant_active_idx
  on clinic.evolution_templates (tenant_id, is_archived);

create trigger evolution_templates_set_updated_at
  before update on clinic.evolution_templates
  for each row execute function clinic.set_updated_at();

alter table clinic.evolution_templates enable row level security;

create policy evolution_templates_tenant_isolation
  on clinic.evolution_templates for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create unique index if not exists evolution_templates_tenant_default_uidx
  on clinic.evolution_templates (tenant_id)
  where is_default and not is_archived;

grant select, insert, update, delete on clinic.evolution_templates
  to authenticated, service_role;

comment on table clinic.evolution_templates is
  'Fichas de evolução em PDF do tenant. Mesmo schema/UX da Anamnese.';

-- ============================================================================
-- Submissões
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evolution_submission_mode') then
    create type clinic.evolution_submission_mode as enum ('interactive', 'desktop');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evolution_submission_status') then
    create type clinic.evolution_submission_status as enum ('draft', 'submitted', 'signed');
  end if;
end$$;

create table if not exists clinic.evolution_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  template_id uuid references clinic.evolution_templates (id) on delete set null,
  mode clinic.evolution_submission_mode not null default 'desktop',
  status clinic.evolution_submission_status not null default 'draft',
  form_values jsonb not null default '{}'::jsonb,
  ink_strokes jsonb not null default '[]'::jsonb,
  flattened_pdf_path text,
  signer_name text,
  signed_at timestamptz,
  submitted_at timestamptz,
  created_by_profile_id uuid references clinic.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evolution_submissions_tenant_idx
  on clinic.evolution_submissions (tenant_id);
create index if not exists evolution_submissions_client_idx
  on clinic.evolution_submissions (tenant_id, client_id, updated_at desc);
create index if not exists evolution_submissions_template_idx
  on clinic.evolution_submissions (tenant_id, template_id);

create trigger evolution_submissions_set_updated_at
  before update on clinic.evolution_submissions
  for each row execute function clinic.set_updated_at();

alter table clinic.evolution_submissions enable row level security;

create policy evolution_submissions_tenant_isolation
  on clinic.evolution_submissions for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.evolution_submissions
  to authenticated, service_role;

comment on table clinic.evolution_submissions is
  'Registros de evolução do paciente baseados em fichas (template em PDF).';
