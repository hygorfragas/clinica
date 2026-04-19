-- Estoque de produtos e precificação (custo, margem, preço) para procedimentos.
-- Procedimento passa a poder exigir contrato específico.

-- =============================================================
-- 1) Procedures: custo, margem, preço final, contrato obrigatório
-- =============================================================
alter table clinic.procedures
  add column if not exists cost_cents int not null default 0,
  add column if not exists profit_margin_percent numeric(6, 2) not null default 0,
  add column if not exists price_cents int not null default 0,
  add column if not exists contract_template_id uuid references clinic.contract_templates (id) on delete set null,
  add column if not exists requires_signed_contract boolean not null default true,
  add column if not exists is_archived boolean not null default false;

comment on column clinic.procedures.cost_cents is
  'Custo direto estimado do procedimento em centavos (insumos + mão de obra).';
comment on column clinic.procedures.profit_margin_percent is
  'Margem de lucro alvo em %. Serve como referência ao calcular price_cents.';
comment on column clinic.procedures.price_cents is
  'Preço de venda armazenado em centavos. Deve refletir custo + margem.';
comment on column clinic.procedures.contract_template_id is
  'Template de contrato vinculado ao procedimento. Pode ser exigido em venda.';
comment on column clinic.procedures.requires_signed_contract is
  'Se true, uma venda do procedimento exige contrato assinado.';

create index if not exists procedures_tenant_not_archived_idx
  on clinic.procedures (tenant_id)
  where is_archived = false;

-- =============================================================
-- 2) Produtos de estoque
-- =============================================================
create table if not exists clinic.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  sku text,
  description text,
  unit text not null default 'un',
  stock_quantity numeric(14, 3) not null default 0,
  low_stock_threshold numeric(14, 3) not null default 0,
  cost_cents int not null default 0,
  price_cents int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_stock_nonneg check (stock_quantity >= 0),
  constraint products_threshold_nonneg check (low_stock_threshold >= 0),
  constraint products_cost_nonneg check (cost_cents >= 0),
  constraint products_price_nonneg check (price_cents >= 0)
);

create index if not exists products_tenant_idx on clinic.products (tenant_id);
create index if not exists products_tenant_name_idx on clinic.products (tenant_id, name);
create unique index if not exists products_tenant_sku_uq
  on clinic.products (tenant_id, lower(sku))
  where sku is not null and length(trim(sku)) > 0;

create trigger products_set_updated_at
  before update on clinic.products
  for each row execute function clinic.set_updated_at();

alter table clinic.products enable row level security;

create policy products_tenant_isolation
  on clinic.products for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.products to authenticated, service_role;

-- =============================================================
-- 3) Movimentações de estoque (auditoria simples)
-- =============================================================
do $$ begin
  create type clinic.inventory_movement_reason as enum (
    'purchase',
    'manual_adjustment',
    'consumption',
    'sale',
    'loss',
    'return'
  );
exception when duplicate_object then null; end $$;

create table if not exists clinic.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  product_id uuid not null references clinic.products (id) on delete cascade,
  delta numeric(14, 3) not null,
  reason clinic.inventory_movement_reason not null default 'manual_adjustment',
  note text,
  ref_table text,
  ref_id uuid,
  created_by_profile_id uuid references clinic.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_idx
  on clinic.inventory_movements (product_id, created_at desc);

alter table clinic.inventory_movements enable row level security;

create policy inventory_movements_tenant_isolation
  on clinic.inventory_movements for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.inventory_movements to authenticated, service_role;

-- Função para movimentar estoque atomicamente
create or replace function clinic.apply_inventory_movement(
  p_tenant_id uuid,
  p_product_id uuid,
  p_delta numeric,
  p_reason clinic.inventory_movement_reason,
  p_note text,
  p_ref_table text,
  p_ref_id uuid,
  p_profile_id uuid
) returns clinic.inventory_movements
language plpgsql
security invoker
as $$
declare
  v_new numeric(14, 3);
  v_mov clinic.inventory_movements;
begin
  update clinic.products
    set stock_quantity = stock_quantity + p_delta,
        updated_at = now()
    where id = p_product_id and tenant_id = p_tenant_id
    returning stock_quantity into v_new;

  if v_new is null then
    raise exception 'Produto não encontrado' using errcode = 'NTFND';
  end if;

  if v_new < 0 then
    raise exception 'Estoque insuficiente' using errcode = 'STKNG';
  end if;

  insert into clinic.inventory_movements
    (tenant_id, product_id, delta, reason, note, ref_table, ref_id, created_by_profile_id)
    values (p_tenant_id, p_product_id, p_delta, p_reason, p_note, p_ref_table, p_ref_id, p_profile_id)
    returning * into v_mov;

  return v_mov;
end;
$$;

grant execute on function clinic.apply_inventory_movement to authenticated, service_role;
