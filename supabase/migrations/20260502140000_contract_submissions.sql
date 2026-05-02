-- Submissões de contrato por paciente — espelha o pipeline de
-- anamnesis_submissions e evolution_submissions. Aplica-se a contratos PDF
-- (mime_type = 'application/pdf') que tenham campos rastreados via
-- contract_templates.form_schema.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'contract_submission_mode') then
    create type clinic.contract_submission_mode as enum ('interactive', 'desktop');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'contract_submission_status') then
    create type clinic.contract_submission_status as enum ('draft', 'submitted', 'signed');
  end if;
end$$;

create table if not exists clinic.contract_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  template_id uuid references clinic.contract_templates (id) on delete set null,
  mode clinic.contract_submission_mode not null default 'desktop',
  status clinic.contract_submission_status not null default 'draft',
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

create index if not exists contract_submissions_tenant_idx
  on clinic.contract_submissions (tenant_id);
create index if not exists contract_submissions_client_idx
  on clinic.contract_submissions (tenant_id, client_id, updated_at desc);
create index if not exists contract_submissions_template_idx
  on clinic.contract_submissions (tenant_id, template_id);

create trigger contract_submissions_set_updated_at
  before update on clinic.contract_submissions
  for each row execute function clinic.set_updated_at();

alter table clinic.contract_submissions enable row level security;

create policy contract_submissions_tenant_isolation
  on clinic.contract_submissions for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.contract_submissions
  to authenticated, service_role;

comment on table clinic.contract_submissions is
  'Submissões de contrato por paciente, baseadas em templates PDF com form_schema rastreado.';
