-- Múltiplos procedimentos por agendamento + baixa de estoque no BOM agregado.

create table if not exists clinic.appointment_procedures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references clinic.tenants (id) on delete cascade,
  appointment_id uuid not null references clinic.appointments (id) on delete cascade,
  procedure_id uuid not null references clinic.procedures (id) on delete restrict,
  display_order int not null default 1,
  created_at timestamptz not null default now(),
  constraint appointment_procedures_display_order_chk check (display_order >= 1)
);

create index if not exists appointment_procedures_tenant_id_idx
  on clinic.appointment_procedures (tenant_id);

create index if not exists appointment_procedures_appointment_id_idx
  on clinic.appointment_procedures (appointment_id, display_order);

alter table clinic.appointment_procedures enable row level security;

drop policy if exists appointment_procedures_tenant_isolation on clinic.appointment_procedures;
create policy appointment_procedures_tenant_isolation
  on clinic.appointment_procedures for all to authenticated
  using (tenant_id = clinic.user_tenant_id())
  with check (tenant_id = clinic.user_tenant_id());

grant select, insert, update, delete on clinic.appointment_procedures to authenticated;
grant all on clinic.appointment_procedures to service_role;

-- Backfill a partir do procedure_id legado (singular).
insert into clinic.appointment_procedures (
  tenant_id,
  appointment_id,
  procedure_id,
  display_order
)
select
  a.tenant_id,
  a.id,
  a.procedure_id,
  1
from clinic.appointments a
where a.procedure_id is not null
  and not exists (
    select 1
      from clinic.appointment_procedures ap
     where ap.appointment_id = a.id
  );

-- Substitui a lista de procedimentos do agendamento de forma atômica
-- e espelha o primeiro item em appointments.procedure_id (compatibilidade).
create or replace function clinic.set_appointment_procedures(
  p_tenant_id uuid,
  p_appointment_id uuid,
  p_procedure_ids uuid[]
) returns void
language plpgsql
security invoker
as $$
declare
  v_appointment_id uuid;
  v_idx int := 0;
  v_procedure_id uuid;
  v_first uuid := null;
  v_count int;
begin
  select id
    into v_appointment_id
    from clinic.appointments
   where id = p_appointment_id
     and tenant_id = p_tenant_id
   for update;

  if v_appointment_id is null then
    raise exception 'Agendamento não encontrado.' using errcode = 'NTFND';
  end if;

  if p_procedure_ids is null then
    p_procedure_ids := array[]::uuid[];
  end if;

  v_count := coalesce(array_length(p_procedure_ids, 1), 0);
  if v_count > 10 then
    raise exception 'Máximo de 10 procedimentos por agendamento.' using errcode = 'P0001';
  end if;

  if v_count > 0 then
    if exists (
      select 1
        from unnest(p_procedure_ids) as pid(id)
       where not exists (
         select 1
           from clinic.procedures p
          where p.id = pid.id
            and p.tenant_id = p_tenant_id
       )
    ) then
      raise exception 'Um ou mais procedimentos não pertencem à clínica.' using errcode = 'P0001';
    end if;
  end if;

  delete from clinic.appointment_procedures
   where appointment_id = p_appointment_id
     and tenant_id = p_tenant_id;

  foreach v_procedure_id in array p_procedure_ids
  loop
    v_idx := v_idx + 1;
    if v_first is null then
      v_first := v_procedure_id;
    end if;
    insert into clinic.appointment_procedures (
      tenant_id,
      appointment_id,
      procedure_id,
      display_order
    ) values (
      p_tenant_id,
      p_appointment_id,
      v_procedure_id,
      v_idx
    );
  end loop;

  update clinic.appointments
     set procedure_id = v_first,
         updated_at = now()
   where id = p_appointment_id
     and tenant_id = p_tenant_id;
end;
$$;

grant execute on function clinic.set_appointment_procedures to authenticated, service_role;

comment on function clinic.set_appointment_procedures is
  'Replace-all atômico dos procedimentos do agendamento; espelha o primeiro em appointments.procedure_id.';

-- Baixa de estoque: aceita produtos do BOM de qualquer procedimento vinculado.
create or replace function clinic.consume_appointment_stock(
  p_tenant_id uuid,
  p_appointment_id uuid,
  p_items jsonb,
  p_profile_id uuid
) returns void
language plpgsql
security invoker
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14, 3);
  v_product_name text;
  v_is_archived boolean;
  v_new_stock numeric(14, 3);
  v_bom_ok boolean;
  v_existing int;
  v_has_procedure boolean;
  v_appointment_id uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe ao menos um produto.' using errcode = 'P0001';
  end if;

  select id
    into v_appointment_id
    from clinic.appointments
   where id = p_appointment_id
     and tenant_id = p_tenant_id
   for update;

  if v_appointment_id is null then
    raise exception 'Agendamento não encontrado' using errcode = 'NTFND';
  end if;

  select exists (
    select 1
      from clinic.appointment_procedures
     where tenant_id = p_tenant_id
       and appointment_id = p_appointment_id
  ) or exists (
    select 1
      from clinic.appointments
     where id = p_appointment_id
       and tenant_id = p_tenant_id
       and procedure_id is not null
  ) into v_has_procedure;

  if not v_has_procedure then
    raise exception 'Agendamento sem procedimento.' using errcode = 'P0001';
  end if;

  select count(*)::int
    into v_existing
    from clinic.inventory_movements
   where tenant_id = p_tenant_id
     and ref_table = 'appointments'
     and ref_id = p_appointment_id
     and reason = 'consumption';

  if v_existing > 0 then
    raise exception 'Estoque deste atendimento já foi baixado.' using errcode = 'ALRDY';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_qty := (v_item->>'quantity')::numeric;
    exception when others then
      raise exception 'Item de baixa inválido.' using errcode = 'P0001';
    end;

    if v_product_id is null or v_qty is null or v_qty <= 0 then
      raise exception 'Quantidade deve ser maior que zero.' using errcode = 'P0001';
    end if;

    select exists (
      select 1
        from clinic.procedure_bom_items bom
       where bom.tenant_id = p_tenant_id
         and bom.product_id = v_product_id
         and (
           bom.procedure_id in (
             select ap.procedure_id
               from clinic.appointment_procedures ap
              where ap.tenant_id = p_tenant_id
                and ap.appointment_id = p_appointment_id
           )
           or bom.procedure_id = (
             select a.procedure_id
               from clinic.appointments a
              where a.id = p_appointment_id
                and a.tenant_id = p_tenant_id
           )
         )
    ) into v_bom_ok;

    if not v_bom_ok then
      raise exception 'Produto fora do BOM deste procedimento.' using errcode = 'NOBOM';
    end if;

    select name, is_archived
      into v_product_name, v_is_archived
      from clinic.products
     where id = v_product_id
       and tenant_id = p_tenant_id
     for update;

    if not found then
      raise exception 'Produto do BOM não encontrado.' using errcode = 'NTFND';
    end if;

    if v_is_archived then
      raise exception 'Produto "%" está excluído e não pode ser consumido.', v_product_name
        using errcode = 'ARCHV';
    end if;

    update clinic.products
       set stock_quantity = stock_quantity - v_qty,
           updated_at = now()
     where id = v_product_id
       and tenant_id = p_tenant_id
     returning stock_quantity into v_new_stock;

    if v_new_stock < 0 then
      raise exception 'Estoque insuficiente para "%".', v_product_name
        using errcode = 'STKNG';
    end if;

    insert into clinic.inventory_movements
      (tenant_id, product_id, delta, reason, note, ref_table, ref_id, created_by_profile_id)
    values
      (
        p_tenant_id,
        v_product_id,
        -v_qty,
        'consumption',
        'Baixa atendimento ' || p_appointment_id::text,
        'appointments',
        p_appointment_id,
        p_profile_id
      );
  end loop;
end;
$$;

comment on function clinic.consume_appointment_stock is
  'Baixa atômica dos insumos do agendamento; BOM agregado de todos os procedimentos vinculados.';
