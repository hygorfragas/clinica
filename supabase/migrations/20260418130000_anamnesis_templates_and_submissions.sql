-- Templates de anamnese/consentimento em PDF (upload pela clínica)
-- e submissões por paciente com dados estruturados + camada de tinta (ink strokes)
-- + PDF final achatado. Armazenamento físico no bucket `clinical` já existente.
--
-- Caminhos no bucket:
--   {tenant_id}/anamnesis-templates/{template_id}.pdf
--   {tenant_id}/{client_id}/anamnesis/{submission_id}.pdf  (opcional)

-- ============================================================================
-- Templates
-- ============================================================================

create table if not exists clinic.anamnesis_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  description text,
  pdf_storage_path text not null,
  page_count integer not null default 1,
  -- Schema de campos posicionados. Cada item:
  -- { id, label, type: 'text'|'textarea'|'checkbox'|'signature'|'date'|'select',
  --   page, x, y, width, height, required?, options?, bind_path? }
  form_schema jsonb not null default '[]'::jsonb,
  -- Diagramas/áreas onde é permitido desenhar/marcar livremente
  -- [{ id, page, x, y, width, height, label }]
  ink_regions jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anamnesis_templates_tenant_idx
  on clinic.anamnesis_templates (tenant_id);
create index if not exists anamnesis_templates_tenant_active_idx
  on clinic.anamnesis_templates (tenant_id, is_archived);

create trigger anamnesis_templates_set_updated_at
  before update on clinic.anamnesis_templates
  for each row execute function clinic.set_updated_at();

alter table clinic.anamnesis_templates enable row level security;

create policy anamnesis_templates_tenant_isolation
  on clinic.anamnesis_templates for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

-- Apenas um template default por tenant.
create unique index if not exists anamnesis_templates_tenant_default_uidx
  on clinic.anamnesis_templates (tenant_id)
  where is_default and not is_archived;

-- ============================================================================
-- Submissões
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'anamnesis_submission_mode') then
    create type clinic.anamnesis_submission_mode as enum ('interactive', 'desktop');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'anamnesis_submission_status') then
    create type clinic.anamnesis_submission_status as enum ('draft', 'submitted', 'signed');
  end if;
end$$;

create table if not exists clinic.anamnesis_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  template_id uuid references clinic.anamnesis_templates (id) on delete set null,
  mode clinic.anamnesis_submission_mode not null default 'desktop',
  status clinic.anamnesis_submission_status not null default 'draft',
  -- Valores dos campos { field_id: value }
  form_values jsonb not null default '{}'::jsonb,
  -- Traços de tinta: [{ page, region_id?, color, width, points: [[x,y], ...] }]
  ink_strokes jsonb not null default '[]'::jsonb,
  -- PDF achatado final (após submit). Caminho em `clinical` bucket.
  flattened_pdf_path text,
  signer_name text,
  signed_at timestamptz,
  submitted_at timestamptz,
  created_by_profile_id uuid references clinic.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anamnesis_submissions_tenant_idx
  on clinic.anamnesis_submissions (tenant_id);
create index if not exists anamnesis_submissions_client_idx
  on clinic.anamnesis_submissions (tenant_id, client_id, updated_at desc);
create index if not exists anamnesis_submissions_template_idx
  on clinic.anamnesis_submissions (tenant_id, template_id);

create trigger anamnesis_submissions_set_updated_at
  before update on clinic.anamnesis_submissions
  for each row execute function clinic.set_updated_at();

alter table clinic.anamnesis_submissions enable row level security;

create policy anamnesis_submissions_tenant_isolation
  on clinic.anamnesis_submissions for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());
