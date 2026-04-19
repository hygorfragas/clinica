-- Histórico de compras/procedimentos por paciente + vínculo de fotos antes/depois.

create table clinic.client_procedure_purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  title text not null,
  procedure_id uuid references clinic.procedures (id) on delete set null,
  budget_id uuid references clinic.budgets (id) on delete set null,
  total_cents int not null,
  currency text not null default 'BRL',
  purchased_at timestamptz not null default now(),
  contract_document_id uuid references clinic.documents (id) on delete set null,
  responsible_profile_id uuid references clinic.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_procedure_purchases_total_nonneg check (total_cents >= 0)
);

create index client_procedure_purchases_tenant_client_idx
  on clinic.client_procedure_purchases (tenant_id, client_id);

create index client_procedure_purchases_purchased_at_idx
  on clinic.client_procedure_purchases (client_id, purchased_at desc);

create trigger client_procedure_purchases_set_updated_at
  before update on clinic.client_procedure_purchases
  for each row execute function clinic.set_updated_at();

comment on table clinic.client_procedure_purchases is
  'Registro de venda/procedimento: valores, vínculo opcional a orçamento, contrato e profissional responsável.';

alter table clinic.photos
  add column if not exists purchase_id uuid references clinic.client_procedure_purchases (id) on delete set null,
  add column if not exists comparison_role text;

alter table clinic.photos drop constraint if exists photos_comparison_role_chk;
alter table clinic.photos
  add constraint photos_comparison_role_chk check (
    comparison_role is null or comparison_role in ('before', 'after')
  );

comment on column clinic.photos.purchase_id is 'Sessão de fotos ligada a uma compra/procedimento específico.';
comment on column clinic.photos.comparison_role is 'Para comparativo clínico: antes ou depois do procedimento da compra.';

create index if not exists photos_purchase_id_idx
  on clinic.photos (purchase_id)
  where purchase_id is not null;

alter table clinic.client_procedure_purchases enable row level security;

create policy client_procedure_purchases_tenant_isolation
  on clinic.client_procedure_purchases for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.client_procedure_purchases to authenticated, service_role;
