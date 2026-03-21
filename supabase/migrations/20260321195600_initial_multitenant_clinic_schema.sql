-- Schema multitenant da clínica no schema `clinic` (convive com outros apps em `public`).
-- Em projeto vazio, pode usar só este arquivo; o client Supabase deve usar .schema('clinic').
--
-- Se já existir `public.handle_new_user` + trigger `on_auth_user_created`, a seção final
-- substitui a função para também inserir em `clinic.profiles` (mantém insert em `public.profiles`).

create schema if not exists clinic;

grant usage on schema clinic to postgres, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Funções auxiliares (schema clinic)
-- ---------------------------------------------------------------------------

create or replace function clinic.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table clinic.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table clinic.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references clinic.tenants (id) on delete set null,
  full_name text not null default '',
  phone text,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_tenant_id_idx on clinic.profiles (tenant_id);

create or replace function clinic.user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = clinic, public
as $$
  select p.tenant_id
  from clinic.profiles p
  where p.id = auth.uid();
$$;

comment on function clinic.user_tenant_id() is 'Tenant atual do usuário autenticado; NULL se sem perfil ou sem tenant.';

create table clinic.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_tenant_id_idx on clinic.clients (tenant_id);
create index clients_tenant_full_name_idx on clinic.clients (tenant_id, full_name);

create table clinic.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_range_chk check (ends_at > starts_at)
);

create index appointments_tenant_id_idx on clinic.appointments (tenant_id);
create index appointments_tenant_starts_idx on clinic.appointments (tenant_id, starts_at);

create table clinic.anamnesis_forms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index anamnesis_forms_tenant_id_idx on clinic.anamnesis_forms (tenant_id);
create index anamnesis_forms_client_id_idx on clinic.anamnesis_forms (client_id);

create table clinic.evolutions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  appointment_id uuid references clinic.appointments (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index evolutions_tenant_id_idx on clinic.evolutions (tenant_id);
create index evolutions_client_id_idx on clinic.evolutions (client_id);

create table clinic.procedures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  description text,
  default_price_cents int,
  duration_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index procedures_tenant_id_idx on clinic.procedures (tenant_id);

create table clinic.budgets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  title text,
  status text not null default 'draft',
  currency text not null default 'BRL',
  subtotal_cents int,
  discount_cents int not null default 0,
  total_cents int,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index budgets_tenant_id_idx on clinic.budgets (tenant_id);

create table clinic.budget_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  budget_id uuid not null references clinic.budgets (id) on delete cascade,
  procedure_id uuid references clinic.procedures (id) on delete set null,
  description text not null,
  quantity numeric not null default 1,
  unit_price_cents int not null,
  line_total_cents int,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index budget_items_tenant_id_idx on clinic.budget_items (tenant_id);
create index budget_items_budget_id_idx on clinic.budget_items (budget_id);

create table clinic.sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  budget_id uuid references clinic.budgets (id) on delete set null,
  appointment_id uuid references clinic.appointments (id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_tenant_id_idx on clinic.sessions (tenant_id);

create table clinic.stock_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  name text not null,
  sku text,
  unit text not null default 'un',
  quantity_numeric numeric not null default 0,
  min_quantity numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_items_tenant_id_idx on clinic.stock_items (tenant_id);

create table clinic.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  stock_item_id uuid not null references clinic.stock_items (id) on delete cascade,
  quantity_delta numeric not null,
  reason text,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index stock_movements_tenant_id_idx on clinic.stock_movements (tenant_id);
create index stock_movements_stock_item_id_idx on clinic.stock_movements (stock_item_id);

create table clinic.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  kind text not null,
  title text,
  storage_key text not null,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_tenant_id_idx on clinic.documents (tenant_id);

create table clinic.photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  storage_key text not null,
  caption text,
  taken_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index photos_tenant_id_idx on clinic.photos (tenant_id);

create table clinic.signatures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  client_id uuid not null references clinic.clients (id) on delete cascade,
  document_id uuid references clinic.documents (id) on delete set null,
  image_storage_key text not null,
  signed_at timestamptz not null default now(),
  signer_name text,
  signer_role text,
  client_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index signatures_tenant_id_idx on clinic.signatures (tenant_id);

create table clinic.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  profile_id uuid not null references clinic.profiles (id) on delete cascade,
  google_account_email text,
  calendar_id text,
  refresh_token_ciphertext text,
  access_token_ciphertext text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_calendar_connections_profile_unique unique (profile_id)
);

create index google_calendar_connections_tenant_id_idx on clinic.google_calendar_connections (tenant_id);

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------

create trigger tenants_set_updated_at
  before update on clinic.tenants
  for each row execute function clinic.set_updated_at();

create trigger profiles_set_updated_at
  before update on clinic.profiles
  for each row execute function clinic.set_updated_at();

create trigger clients_set_updated_at
  before update on clinic.clients
  for each row execute function clinic.set_updated_at();

create trigger appointments_set_updated_at
  before update on clinic.appointments
  for each row execute function clinic.set_updated_at();

create trigger anamnesis_forms_set_updated_at
  before update on clinic.anamnesis_forms
  for each row execute function clinic.set_updated_at();

create trigger evolutions_set_updated_at
  before update on clinic.evolutions
  for each row execute function clinic.set_updated_at();

create trigger procedures_set_updated_at
  before update on clinic.procedures
  for each row execute function clinic.set_updated_at();

create trigger budgets_set_updated_at
  before update on clinic.budgets
  for each row execute function clinic.set_updated_at();

create trigger budget_items_set_updated_at
  before update on clinic.budget_items
  for each row execute function clinic.set_updated_at();

create trigger sessions_set_updated_at
  before update on clinic.sessions
  for each row execute function clinic.set_updated_at();

create trigger stock_items_set_updated_at
  before update on clinic.stock_items
  for each row execute function clinic.set_updated_at();

create trigger documents_set_updated_at
  before update on clinic.documents
  for each row execute function clinic.set_updated_at();

create trigger photos_set_updated_at
  before update on clinic.photos
  for each row execute function clinic.set_updated_at();

create trigger signatures_set_updated_at
  before update on clinic.signatures
  for each row execute function clinic.set_updated_at();

create trigger google_calendar_connections_set_updated_at
  before update on clinic.google_calendar_connections
  for each row execute function clinic.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: estende handle_new_user existente (não criar segundo trigger)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, clinic
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  insert into clinic.profiles (id, full_name, tenant_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif((new.raw_user_meta_data->>'tenant_id')::uuid, null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table clinic.tenants enable row level security;
alter table clinic.profiles enable row level security;
alter table clinic.clients enable row level security;
alter table clinic.appointments enable row level security;
alter table clinic.anamnesis_forms enable row level security;
alter table clinic.evolutions enable row level security;
alter table clinic.procedures enable row level security;
alter table clinic.budgets enable row level security;
alter table clinic.budget_items enable row level security;
alter table clinic.sessions enable row level security;
alter table clinic.stock_items enable row level security;
alter table clinic.stock_movements enable row level security;
alter table clinic.documents enable row level security;
alter table clinic.photos enable row level security;
alter table clinic.signatures enable row level security;
alter table clinic.google_calendar_connections enable row level security;

create policy tenants_select_member
  on clinic.tenants
  for select
  to authenticated
  using (id = clinic.user_tenant_id());

create policy profiles_select_visible
  on clinic.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or (
      tenant_id is not null
      and tenant_id = (
        select p.tenant_id from clinic.profiles p where p.id = auth.uid()
      )
    )
  );

create policy profiles_update_self
  on clinic.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy clients_tenant_isolation
  on clinic.clients for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy appointments_tenant_isolation
  on clinic.appointments for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy anamnesis_forms_tenant_isolation
  on clinic.anamnesis_forms for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy evolutions_tenant_isolation
  on clinic.evolutions for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy procedures_tenant_isolation
  on clinic.procedures for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy budgets_tenant_isolation
  on clinic.budgets for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy budget_items_tenant_isolation
  on clinic.budget_items for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy sessions_tenant_isolation
  on clinic.sessions for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy stock_items_tenant_isolation
  on clinic.stock_items for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy stock_movements_tenant_isolation
  on clinic.stock_movements for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy documents_tenant_isolation
  on clinic.documents for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy photos_tenant_isolation
  on clinic.photos for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy signatures_tenant_isolation
  on clinic.signatures for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

create policy google_calendar_connections_tenant_isolation
  on clinic.google_calendar_connections for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema clinic to authenticated, service_role;
