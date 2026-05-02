-- Cancelamento automático de orçamentos vencidos.
-- Regra: orçamentos com status 'sent' e valid_until < hoje viram 'cancelled'.
-- Rascunhos (draft) e aprovados (approved) nunca são tocados automaticamente.

-- pg_cron já é disponibilizado pelo Supabase; o create extension é idempotente.
create extension if not exists pg_cron;

-- Colunas auxiliares para rastrear origem e data do cancelamento.
alter table clinic.budgets
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

comment on column clinic.budgets.cancelled_at is
  'Data/hora em que o orçamento foi cancelado (manual ou automático).';
comment on column clinic.budgets.cancellation_reason is
  'Motivo estruturado do cancelamento. Ex.: "auto_expired", "manual".';

-- Índice parcial para acelerar a varredura do cron nos orçamentos enviados
-- com prazo definido.
create index if not exists budgets_sent_valid_until_idx
  on clinic.budgets (valid_until)
  where status = 'sent' and valid_until is not null;

-- Função que expira orçamentos enviados cujo prazo passou.
-- Idempotente: pode ser executada várias vezes ao dia sem efeitos colaterais.
create or replace function clinic.expire_sent_budgets()
returns integer
language plpgsql
security definer
set search_path = clinic, public
as $$
declare
  v_count integer;
begin
  update clinic.budgets
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = 'auto_expired',
         updated_at = now()
   where status = 'sent'
     and valid_until is not null
     and valid_until < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function clinic.expire_sent_budgets() is
  'Marca como "cancelled" os orçamentos "sent" cujo valid_until já expirou. Chamado diariamente pelo pg_cron.';

revoke all on function clinic.expire_sent_budgets() from public;
grant execute on function clinic.expire_sent_budgets() to postgres;

-- Agenda diária às 03:15 UTC. Remove job anterior com mesmo nome antes de
-- recriar para manter a migration idempotente.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'clinic-expire-sent-budgets';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'clinic-expire-sent-budgets',
    '15 3 * * *',
    $cron$ select clinic.expire_sent_budgets(); $cron$
  );
end;
$$;
