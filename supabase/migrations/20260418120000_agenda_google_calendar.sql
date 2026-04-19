-- F1 — Agenda completa + integração Google Calendar (pull incremental + alternável para webhook)
-- Estende `clinic.appointments`, adiciona `clinic.calendar_settings`,
-- `clinic.google_calendar_sync_state` e `clinic.google_calendar_outbox`.

-- ----------------------------------------------------------------------------
-- Extensão de appointments
-- ----------------------------------------------------------------------------

alter table clinic.appointments
  add column if not exists procedure_id uuid references clinic.procedures (id) on delete set null,
  add column if not exists title text,
  add column if not exists color text,
  add column if not exists location text,
  add column if not exists source text not null default 'system',
  add column if not exists google_event_id text,
  add column if not exists google_calendar_id text,
  add column if not exists google_etag text,
  add column if not exists google_sync_status text not null default 'pending',
  add column if not exists google_synced_at timestamptz,
  add column if not exists created_by_profile_id uuid references clinic.profiles (id) on delete set null;

create index if not exists appointments_tenant_starts_ends_idx
  on clinic.appointments (tenant_id, starts_at, ends_at);

create index if not exists appointments_google_event_idx
  on clinic.appointments (tenant_id, google_event_id);

-- Garante um único `google_event_id` por tenant (quando não nulo)
create unique index if not exists appointments_tenant_google_event_unique
  on clinic.appointments (tenant_id, google_event_id)
  where google_event_id is not null;

-- ----------------------------------------------------------------------------
-- Configurações da agenda por tenant
-- ----------------------------------------------------------------------------

create table if not exists clinic.calendar_settings (
  tenant_id uuid primary key references clinic.tenants (id) on delete cascade,
  google_sync_mode text not null default 'off' check (google_sync_mode in ('off','pull','webhook')),
  pull_interval_minutes int not null default 5 check (pull_interval_minutes between 1 and 1440),
  default_calendar_id text,
  default_slot_minutes int not null default 30 check (default_slot_minutes between 5 and 240),
  business_hours jsonb not null default jsonb_build_object(
    'start','08:00',
    'end','19:00',
    'days', jsonb_build_array(1,2,3,4,5,6)
  ),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table clinic.calendar_settings enable row level security;

drop policy if exists calendar_settings_tenant_isolation on clinic.calendar_settings;
create policy calendar_settings_tenant_isolation
  on clinic.calendar_settings for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

drop trigger if exists calendar_settings_set_updated_at on clinic.calendar_settings;
create trigger calendar_settings_set_updated_at
  before update on clinic.calendar_settings
  for each row execute function clinic.set_updated_at();

-- ----------------------------------------------------------------------------
-- Estado de sync com Google Calendar (por conexão)
-- ----------------------------------------------------------------------------

create table if not exists clinic.google_calendar_sync_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  connection_id uuid not null references clinic.google_calendar_connections (id) on delete cascade,
  calendar_id text not null,
  sync_token text,
  last_synced_at timestamptz,
  last_error text,
  webhook_channel_id text,
  webhook_resource_id text,
  webhook_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_calendar_sync_state_unique unique (connection_id, calendar_id)
);

create index if not exists google_calendar_sync_state_tenant_idx
  on clinic.google_calendar_sync_state (tenant_id);

alter table clinic.google_calendar_sync_state enable row level security;

drop policy if exists google_calendar_sync_state_tenant_isolation on clinic.google_calendar_sync_state;
create policy google_calendar_sync_state_tenant_isolation
  on clinic.google_calendar_sync_state for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

drop trigger if exists google_calendar_sync_state_set_updated_at on clinic.google_calendar_sync_state;
create trigger google_calendar_sync_state_set_updated_at
  before update on clinic.google_calendar_sync_state
  for each row execute function clinic.set_updated_at();

-- ----------------------------------------------------------------------------
-- Fila de sincronização sistema → Google (retry com backoff)
-- ----------------------------------------------------------------------------

create table if not exists clinic.google_calendar_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  appointment_id uuid not null references clinic.appointments (id) on delete cascade,
  operation text not null check (operation in ('insert','update','delete')),
  payload jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_calendar_outbox_pending_idx
  on clinic.google_calendar_outbox (tenant_id, processed_at)
  where processed_at is null;

alter table clinic.google_calendar_outbox enable row level security;

drop policy if exists google_calendar_outbox_tenant_isolation on clinic.google_calendar_outbox;
create policy google_calendar_outbox_tenant_isolation
  on clinic.google_calendar_outbox for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

drop trigger if exists google_calendar_outbox_set_updated_at on clinic.google_calendar_outbox;
create trigger google_calendar_outbox_set_updated_at
  before update on clinic.google_calendar_outbox
  for each row execute function clinic.set_updated_at();

-- ----------------------------------------------------------------------------
-- Função de conflito de agendamento (mesmo tenant, janelas sobrepostas,
-- status != 'canceled' e ignorando um id, quando editando).
-- ----------------------------------------------------------------------------

create or replace function clinic.appointment_conflict(
  p_tenant_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_ignore_id uuid default null
)
returns table (
  id uuid,
  client_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  title text,
  client_name text
)
language sql
stable
security definer
set search_path = clinic, public
as $$
  select a.id, a.client_id, a.starts_at, a.ends_at, a.title, c.full_name as client_name
  from clinic.appointments a
  left join clinic.clients c on c.id = a.client_id
  where a.tenant_id = p_tenant_id
    and a.status <> 'canceled'
    and (p_ignore_id is null or a.id <> p_ignore_id)
    and a.starts_at < p_ends_at
    and a.ends_at > p_starts_at
  order by a.starts_at asc
  limit 1;
$$;

comment on function clinic.appointment_conflict is
  'Retorna o primeiro agendamento que colide com a janela informada, ou vazio. Usa SECURITY DEFINER + search_path clinic.';

grant execute on function clinic.appointment_conflict(uuid, timestamptz, timestamptz, uuid)
  to authenticated, service_role;
