-- Atualização atômica de orçamento: serializa por row lock, revalida status e
-- bloqueio financeiro dentro da mesma transação antes de substituir os itens.

create or replace function clinic.update_budget(
  p_tenant_id uuid,
  p_budget_id uuid,
  p_title text,
  p_valid_until date,
  p_discount_cents int,
  p_items jsonb
) returns void
language plpgsql
security invoker
as $$
declare
  v_budget clinic.budgets%rowtype;
  v_item jsonb;
  v_idx int := 0;
  v_subtotal int := 0;
  v_total int;
  v_qty numeric;
  v_unit_price_cents int;
  v_line_total int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione ao menos um item.' using errcode = 'P0001';
  end if;

  if p_discount_cents is null or p_discount_cents < 0 then
    raise exception 'Desconto inválido.' using errcode = 'P0001';
  end if;

  select *
    into v_budget
    from clinic.budgets
   where id = p_budget_id
     and tenant_id = p_tenant_id
   for update;

  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = 'NTFND';
  end if;

  if v_budget.status not in ('draft', 'sent') then
    raise exception 'Só é possível editar orçamentos em rascunho ou enviados.' using errcode = 'NTEDT';
  end if;

  if exists (
    select 1
      from clinic.client_procedure_purchases
     where tenant_id = p_tenant_id
       and budget_id = p_budget_id
  ) then
    raise exception 'Este orçamento já foi lançado no financeiro e não pode ser editado.' using errcode = 'FINLK';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := (v_item->>'quantity')::numeric;
      v_unit_price_cents := (v_item->>'unit_price_cents')::int;
    exception when others then
      raise exception 'Item de orçamento inválido.' using errcode = 'P0001';
    end;

    if v_qty is null or v_qty < 1 or v_qty > 30 then
      raise exception 'Quantidade inválida em um item.' using errcode = 'P0001';
    end if;

    if v_unit_price_cents is null or v_unit_price_cents < 0 then
      raise exception 'Preço unitário inválido em um item.' using errcode = 'P0001';
    end if;

    if coalesce(trim(v_item->>'description'), '') = '' then
      raise exception 'Descrição obrigatória em todos os itens.' using errcode = 'P0001';
    end if;

    v_line_total := (v_qty * v_unit_price_cents)::int;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := greatest(0, v_subtotal - p_discount_cents);

  update clinic.budgets
     set title = nullif(trim(p_title), ''),
         valid_until = p_valid_until,
         discount_cents = p_discount_cents,
         subtotal_cents = v_subtotal,
         total_cents = v_total,
         updated_at = now()
   where id = p_budget_id
     and tenant_id = p_tenant_id;

  delete from clinic.budget_items
   where budget_id = p_budget_id
     and tenant_id = p_tenant_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_idx := v_idx + 1;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price_cents := (v_item->>'unit_price_cents')::int;
    v_line_total := (v_qty * v_unit_price_cents)::int;

    insert into clinic.budget_items (
      tenant_id,
      budget_id,
      procedure_id,
      description,
      quantity,
      unit_price_cents,
      line_total_cents,
      display_order
    ) values (
      p_tenant_id,
      p_budget_id,
      nullif(v_item->>'procedure_id', '')::uuid,
      trim(v_item->>'description'),
      v_qty,
      v_unit_price_cents,
      v_line_total,
      v_idx
    );
  end loop;
end;
$$;

grant execute on function clinic.update_budget to authenticated, service_role;

comment on function clinic.update_budget is
  'Atualiza cabeçalho e itens de orçamento de forma atômica; bloqueia edição após lançamento financeiro.';
