-- Dados cadastrais de paciente (CPF/endereço), ativos de assinatura/carimbo por profissional
-- e vínculo do documento ao profissional responsável pelo procedimento/contrato.

alter table clinic.clients
  add column if not exists cpf text,
  add column if not exists address text;

comment on column clinic.clients.cpf is 'CPF ou documento principal da paciente (texto livre formatado na UI).';
comment on column clinic.clients.address is 'Endereço completo ou resumido da paciente.';

alter table clinic.profiles
  add column if not exists professional_registration text,
  add column if not exists cpf text,
  add column if not exists address text,
  add column if not exists signature_storage_key text,
  add column if not exists stamp_storage_key text;

comment on column clinic.profiles.professional_registration is 'CRM, CRO ou registro profissional exibido em documentos.';
comment on column clinic.profiles.signature_storage_key is 'Imagem da assinatura (PNG/JPG/WebP) no bucket clinical, path profiles/{id}/....';
comment on column clinic.profiles.stamp_storage_key is 'Imagem do carimbo digitalizado no bucket clinical, path profiles/{id}/....';

alter table clinic.documents
  add column if not exists responsible_profile_id uuid references clinic.profiles (id) on delete set null;

create index if not exists documents_responsible_profile_id_idx
  on clinic.documents (responsible_profile_id)
  where responsible_profile_id is not null;

comment on column clinic.documents.responsible_profile_id is
  'Profissional que anexou o contrato / responsável pelo procedimento vinculado a este documento.';
