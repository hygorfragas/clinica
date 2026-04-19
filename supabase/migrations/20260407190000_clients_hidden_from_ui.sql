-- Ocultar paciente apenas na interface (registro permanece no banco).

alter table clinic.clients
  add column if not exists hidden_from_ui_at timestamptz;

comment on column clinic.clients.hidden_from_ui_at is
  'Preenchido quando a paciente é removida da lista/ficha na UI; dados clínicos permanecem no tenant.';

create index if not exists clients_tenant_visible_idx
  on clinic.clients (tenant_id)
  where hidden_from_ui_at is null;
