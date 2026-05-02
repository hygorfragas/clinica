-- Permite marcar campos interativos (assinatura, texto, etc.) sobre um contrato em PDF.
-- Mesmo formato e semântica do form_schema usado em clinic.anamnesis_templates.

alter table clinic.contract_templates
  add column if not exists form_schema jsonb not null default '[]'::jsonb,
  add column if not exists page_count integer not null default 1;

comment on column clinic.contract_templates.form_schema is
  'Lista de campos interativos (texto, assinatura, rubrica, etc.) ancorados em coordenadas normalizadas do PDF. Mesmo schema de clinic.anamnesis_templates.form_schema.';
comment on column clinic.contract_templates.page_count is
  'Quantidade de páginas do PDF (cache para evitar reabrir o arquivo).';
