-- Baixa atômica de estoque por atendimento + proteção contra consumo duplicado.

create unique index if not exists inventory_movements_appt_consumption_product_uq
  on clinic.inventory_movements (tenant_id, ref_id, product_id)
  where reason = 'consumption'
    and ref_table = 'appointments'
    and ref_id is not null;

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
  v_procedure_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty numeric(14, 3);
  v_product_name text;
  v_is_archived boolean;
  v_new_stock numeric(14, 3);
  v_bom_ok boolean;
  v_existing int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe ao menos um produto.' using errcode = 'P0001';
  end if;

  -- Serializa baixas concorrentes no mesmo agendamento.
  select procedure_id
    into v_procedure_id
    from clinic.appointments
    where id = p_appointment_id
      and tenant_id = p_tenant_id
    for update;

  if not found then
    raise exception 'Agendamento não encontrado' using errcode = 'NTFND';
  end if;

  if v_procedure_id is null then
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
        from clinic.procedure_bom_items
       where tenant_id = p_tenant_id
         and procedure_id = v_procedure_id
         and product_id = v_product_id
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

grant execute on function clinic.consume_appointment_stock to authenticated, service_role;

comment on function clinic.consume_appointment_stock is
  'Baixa atômica dos insumos de um agendamento; serializa por row lock e rejeita consumo duplicado.';
