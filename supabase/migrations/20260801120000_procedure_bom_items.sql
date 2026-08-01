-- BOM: insumos padrão por procedimento (consumo de estoque no atendimento).

create table if not exists clinic.procedure_bom_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  procedure_id uuid not null references clinic.procedures (id) on delete cascade,
  product_id uuid not null references clinic.products (id) on delete restrict,
  quantity numeric(14, 3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint procedure_bom_items_quantity_positive check (quantity > 0),
  constraint procedure_bom_items_procedure_product_uq unique (procedure_id, product_id)
);

create index if not exists procedure_bom_items_tenant_idx
  on clinic.procedure_bom_items (tenant_id);

create index if not exists procedure_bom_items_procedure_idx
  on clinic.procedure_bom_items (procedure_id);

create index if not exists procedure_bom_items_product_idx
  on clinic.procedure_bom_items (product_id);

create trigger procedure_bom_items_set_updated_at
  before update on clinic.procedure_bom_items
  for each row execute function clinic.set_updated_at();

alter table clinic.procedure_bom_items enable row level security;

create policy procedure_bom_items_tenant_isolation
  on clinic.procedure_bom_items for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.procedure_bom_items to authenticated, service_role;

comment on table clinic.procedure_bom_items is
  'Insumos padrão (BOM) de um procedimento; quantidade pode ser ajustada na baixa do atendimento.';
