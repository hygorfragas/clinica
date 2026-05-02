-- Módulo Financeiro v1 — regime de caixa.
-- Tabelas:
--   financial_accounts       — caixa, banco, carteira digital…
--   financial_categories     — receita/despesa hierárquica
--   financial_payment_methods— Pix, dinheiro, cartão…
--   financial_transactions   — lançamentos (manuais ou auto via dispatcher)
-- Idempotência via (source_kind, source_id). Contra-lançamento via
-- reverses_transaction_id (preserva histórico).

-- =============================================================================
-- financial_accounts
-- =============================================================================
create table clinic.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  kind text not null default 'cash'
    check (kind in ('cash', 'bank', 'wallet', 'other')),
  opening_balance_cents bigint not null default 0,
  currency text not null default 'BRL',
  is_archived boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_accounts_tenant_id_idx
  on clinic.financial_accounts (tenant_id);

create trigger financial_accounts_set_updated_at
  before update on clinic.financial_accounts
  for each row execute function clinic.set_updated_at();

alter table clinic.financial_accounts enable row level security;

create policy financial_accounts_tenant_isolation
  on clinic.financial_accounts for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.financial_accounts to authenticated, service_role;

comment on table clinic.financial_accounts is
  'Contas financeiras da clínica (caixa físico, banco, Pix, etc.). Saldo é calculado a partir das transações + opening_balance.';

-- =============================================================================
-- financial_categories
-- =============================================================================
create table clinic.financial_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  kind text not null
    check (kind in ('income', 'expense')),
  parent_id uuid references clinic.financial_categories (id) on delete set null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_categories_tenant_id_idx
  on clinic.financial_categories (tenant_id);
create index financial_categories_kind_idx
  on clinic.financial_categories (tenant_id, kind);

create trigger financial_categories_set_updated_at
  before update on clinic.financial_categories
  for each row execute function clinic.set_updated_at();

alter table clinic.financial_categories enable row level security;

create policy financial_categories_tenant_isolation
  on clinic.financial_categories for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.financial_categories to authenticated, service_role;

comment on table clinic.financial_categories is
  'Categorias de receita/despesa, hierárquicas (parent_id self-ref).';

-- =============================================================================
-- financial_payment_methods
-- =============================================================================
create table clinic.financial_payment_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  kind text not null default 'other'
    check (kind in ('cash', 'pix', 'debit_card', 'credit_card', 'bank_transfer', 'other')),
  default_account_id uuid references clinic.financial_accounts (id) on delete set null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_payment_methods_tenant_id_idx
  on clinic.financial_payment_methods (tenant_id);

create trigger financial_payment_methods_set_updated_at
  before update on clinic.financial_payment_methods
  for each row execute function clinic.set_updated_at();

alter table clinic.financial_payment_methods enable row level security;

create policy financial_payment_methods_tenant_isolation
  on clinic.financial_payment_methods for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.financial_payment_methods to authenticated, service_role;

comment on table clinic.financial_payment_methods is
  'Formas de pagamento que a clínica aceita; aponta para uma conta default que recebe o dinheiro.';

-- =============================================================================
-- financial_transactions
-- =============================================================================
create table clinic.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  kind text not null
    check (kind in ('income', 'expense')),
  status text not null default 'paid'
    check (status in ('pending', 'paid', 'cancelled')),
  amount_cents bigint not null check (amount_cents > 0),
  description text,
  notes text,
  occurred_on date not null default current_date,
  due_date date,
  paid_at timestamptz,
  account_id uuid references clinic.financial_accounts (id) on delete set null,
  category_id uuid references clinic.financial_categories (id) on delete set null,
  payment_method_id uuid references clinic.financial_payment_methods (id) on delete set null,
  client_id uuid references clinic.clients (id) on delete set null,
  responsible_profile_id uuid references clinic.profiles (id) on delete set null,
  -- Idempotência: vincula a transação ao registro que a originou (venda, orçamento, parcela…).
  -- Quando ambos preenchidos, há índice único parcial impedindo duplicação.
  source_kind text check (source_kind in ('manual', 'sale', 'budget', 'budget_installment', 'procedure_purchase', 'reversal')),
  source_id uuid,
  -- Contra-lançamento: se a transação for um estorno, aponta para a original.
  reverses_transaction_id uuid references clinic.financial_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_transactions_tenant_id_idx
  on clinic.financial_transactions (tenant_id);
create index financial_transactions_tenant_date_idx
  on clinic.financial_transactions (tenant_id, occurred_on desc);
create index financial_transactions_account_idx
  on clinic.financial_transactions (account_id);
create index financial_transactions_category_idx
  on clinic.financial_transactions (category_id);
create index financial_transactions_status_due_idx
  on clinic.financial_transactions (tenant_id, status, due_date);

-- Idempotência: para cada (source_kind, source_id) só pode existir uma transação ATIVA
-- (paid ou pending). Estornos (status = 'cancelled') ficam de fora; a função do dispatcher
-- usa essa unicidade para detectar duplicação.
create unique index financial_transactions_source_unique
  on clinic.financial_transactions (tenant_id, source_kind, source_id)
  where source_kind is not null
    and source_id is not null
    and status <> 'cancelled'
    and reverses_transaction_id is null;

create trigger financial_transactions_set_updated_at
  before update on clinic.financial_transactions
  for each row execute function clinic.set_updated_at();

alter table clinic.financial_transactions enable row level security;

create policy financial_transactions_tenant_isolation
  on clinic.financial_transactions for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.financial_transactions to authenticated, service_role;

comment on table clinic.financial_transactions is
  'Lançamento (regime de caixa). Pode ser manual (source_kind=manual) ou gerado pelo dispatcher (source_kind=sale|budget|...). Estorno preserva original via reverses_transaction_id.';
