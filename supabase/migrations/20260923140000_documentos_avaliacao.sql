-- Documento da avaliação na ficha da paciente.
-- Não reutiliza clinic.documents: aquela tabela guarda arquivos soltos e contratos.
-- Sem coluna de prazo: o documento e as cópias permanecem até a profissional apagar.

create table clinic.evaluation_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  responsible_profile_id uuid not null references clinic.profiles (id) on delete restrict,
  title text,
  protocol_value numeric(12, 2),
  body_text text not null default '',
  page_table jsonb,
  checklist jsonb,
  subpages jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_documents_protocol_value_non_negative
    check (protocol_value is null or protocol_value >= 0)
);

comment on table clinic.evaluation_documents is
  'Relatório da avaliação escrito pela profissional responsável. A data da lista é created_at e não muda nas edições.';
comment on column clinic.evaluation_documents.protocol_value is
  'Valor do protocolo, separado do texto. Nulo enquanto a profissional não informar.';
comment on column clinic.evaluation_documents.created_at is
  'Data de criação mostrada na lista. Não deve ser reescrita numa edição.';

create index evaluation_documents_tenant_client_created_idx
  on clinic.evaluation_documents (tenant_id, client_id, created_at desc);
create index evaluation_documents_responsible_idx
  on clinic.evaluation_documents (responsible_profile_id);

create table clinic.evaluation_document_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  document_id uuid not null references clinic.evaluation_documents (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  responsible_profile_id uuid not null references clinic.profiles (id) on delete restrict,
  title text,
  protocol_value numeric(12, 2),
  body_text text not null default '',
  page_table jsonb,
  checklist jsonb,
  subpages jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_document_versions_protocol_value_non_negative
    check (protocol_value is null or protocol_value >= 0)
);

comment on table clinic.evaluation_document_versions is
  'Estado anterior guardado a cada salvamento. A profissional consulta, altera e apaga como a versão atual.';

create index evaluation_document_versions_document_idx
  on clinic.evaluation_document_versions (document_id, created_at desc);
create index evaluation_document_versions_tenant_client_idx
  on clinic.evaluation_document_versions (tenant_id, client_id);

create table clinic.evaluation_document_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  document_id uuid not null references clinic.evaluation_documents (id) on delete cascade,
  version_id uuid references clinic.evaluation_document_versions (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  responsible_profile_id uuid not null references clinic.profiles (id) on delete restrict,
  kind text not null,
  storage_key text not null,
  file_name text not null,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_document_assets_kind_check
    check (kind in ('attachment', 'audio'))
);

comment on table clinic.evaluation_document_assets is
  'Anexo ou áudio do documento. version_id nulo é o conteúdo atual; preenchido entra na versão daquele momento. Não vai no arquivo encaminhado.';

create index evaluation_document_assets_document_current_idx
  on clinic.evaluation_document_assets (document_id)
  where version_id is null;
create index evaluation_document_assets_version_idx
  on clinic.evaluation_document_assets (version_id)
  where version_id is not null;

create table clinic.evaluation_document_copies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  document_id uuid not null references clinic.evaluation_documents (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  responsible_profile_id uuid not null references clinic.profiles (id) on delete restrict,
  body_text text not null,
  protocol_value numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_document_copies_protocol_value_non_negative
    check (protocol_value is null or protocol_value >= 0)
);

comment on table clinic.evaluation_document_copies is
  'Cópia de um encaminhamento: texto e, se houver, valor do protocolo. Sai junto com o documento. Sem prazo automático.';

create index evaluation_document_copies_document_idx
  on clinic.evaluation_document_copies (document_id, created_at desc);
create index evaluation_document_copies_tenant_client_idx
  on clinic.evaluation_document_copies (tenant_id, client_id);

create or replace function clinic.evaluation_document_same_clinic()
returns trigger
language plpgsql
set search_path = clinic
as $$
begin
  if not exists (
    select 1
    from clinic.clients
    where id = new.client_id
      and tenant_id = new.tenant_id
  ) then
    raise exception 'paciente fora da clinica do documento';
  end if;

  if not exists (
    select 1
    from clinic.profiles
    where id = new.responsible_profile_id
      and tenant_id = new.tenant_id
  ) then
    raise exception 'profissional fora da clinica do documento';
  end if;

  return new;
end;
$$;

create trigger evaluation_documents_same_clinic
  before insert or update on clinic.evaluation_documents
  for each row execute function clinic.evaluation_document_same_clinic();

create trigger evaluation_document_versions_same_clinic
  before insert or update on clinic.evaluation_document_versions
  for each row execute function clinic.evaluation_document_same_clinic();

create trigger evaluation_document_assets_same_clinic
  before insert or update on clinic.evaluation_document_assets
  for each row execute function clinic.evaluation_document_same_clinic();

create trigger evaluation_document_copies_same_clinic
  before insert or update on clinic.evaluation_document_copies
  for each row execute function clinic.evaluation_document_same_clinic();

create trigger evaluation_documents_set_updated_at
  before update on clinic.evaluation_documents
  for each row execute function clinic.set_updated_at();

create trigger evaluation_document_versions_set_updated_at
  before update on clinic.evaluation_document_versions
  for each row execute function clinic.set_updated_at();

create trigger evaluation_document_assets_set_updated_at
  before update on clinic.evaluation_document_assets
  for each row execute function clinic.set_updated_at();

create trigger evaluation_document_copies_set_updated_at
  before update on clinic.evaluation_document_copies
  for each row execute function clinic.set_updated_at();

alter table clinic.evaluation_documents enable row level security;
alter table clinic.evaluation_document_versions enable row level security;
alter table clinic.evaluation_document_assets enable row level security;
alter table clinic.evaluation_document_copies enable row level security;

create policy evaluation_documents_responsible_only
  on clinic.evaluation_documents
  for all
  to authenticated
  using (
    tenant_id = clinic.user_tenant_id()
    and responsible_profile_id = auth.uid()
  )
  with check (
    tenant_id = clinic.user_tenant_id()
    and responsible_profile_id = auth.uid()
  );

create policy evaluation_document_versions_responsible_only
  on clinic.evaluation_document_versions
  for all
  to authenticated
  using (
    tenant_id = clinic.user_tenant_id()
    and responsible_profile_id = auth.uid()
  )
  with check (
    tenant_id = clinic.user_tenant_id()
    and responsible_profile_id = auth.uid()
  );

create policy evaluation_document_assets_responsible_only
  on clinic.evaluation_document_assets
  for all
  to authenticated
  using (
    tenant_id = clinic.user_tenant_id()
    and responsible_profile_id = auth.uid()
  )
  with check (
    tenant_id = clinic.user_tenant_id()
    and responsible_profile_id = auth.uid()
  );

create policy evaluation_document_copies_responsible_only
  on clinic.evaluation_document_copies
  for all
  to authenticated
  using (
    tenant_id = clinic.user_tenant_id()
    and responsible_profile_id = auth.uid()
  )
  with check (
    tenant_id = clinic.user_tenant_id()
    and responsible_profile_id = auth.uid()
  );

grant select, insert, update, delete
  on clinic.evaluation_documents
  to authenticated, service_role;

grant select, insert, update, delete
  on clinic.evaluation_document_versions
  to authenticated, service_role;

grant select, insert, update, delete
  on clinic.evaluation_document_assets
  to authenticated, service_role;

grant select, insert, update, delete
  on clinic.evaluation_document_copies
  to authenticated, service_role;
