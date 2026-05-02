"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFinancialContext } from "./access";
import {
  accountInputSchema,
  accountUpdateSchema,
  categoryInputSchema,
  categoryUpdateSchema,
  paymentMethodInputSchema,
  paymentMethodUpdateSchema,
  transactionInputSchema,
  transactionUpdateSchema,
  type AccountInput,
  type AccountUpdateInput,
  type CategoryInput,
  type CategoryUpdateInput,
  type PaymentMethodInput,
  type PaymentMethodUpdateInput,
  type TransactionInput,
  type TransactionUpdateInput,
} from "./schemas";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

const idSchema = z.string().uuid();

function bumpAll() {
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/lancamentos");
  revalidatePath("/financeiro/contas");
  revalidatePath("/financeiro/categorias");
  revalidatePath("/financeiro/relatorios");
}

/* ========================================================================== */
/* Contas                                                                     */
/* ========================================================================== */

export async function createFinancialAccount(
  input: AccountInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("financial_accounts")
    .insert({
      tenant_id: ctx.tenantId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      opening_balance_cents: parsed.data.openingBalanceCents,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao criar conta." };
  }
  bumpAll();
  return { ok: true, id: data.id };
}

export async function updateFinancialAccount(
  input: AccountUpdateInput,
): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsed = accountUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_accounts")
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind,
      opening_balance_cents: parsed.data.openingBalanceCents,
      notes: parsed.data.notes ?? null,
      ...(parsed.data.isArchived !== undefined
        ? { is_archived: parsed.data.isArchived }
        : {}),
    })
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return { ok: false, error: error.message ?? "Falha ao atualizar conta." };
  }
  bumpAll();
  return { ok: true };
}

export async function deleteFinancialAccount(id: string): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Id inválido." };

  // Se houver transações vinculadas, arquiva em vez de excluir.
  const { count } = await ctx.supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("id", { head: true, count: "exact" })
    .eq("tenant_id", ctx.tenantId)
    .eq("account_id", parsedId.data);

  if ((count ?? 0) > 0) {
    const { error } = await ctx.supabase
      .schema("clinic")
      .from("financial_accounts")
      .update({ is_archived: true })
      .eq("id", parsedId.data)
      .eq("tenant_id", ctx.tenantId);
    if (error) return { ok: false, error: error.message ?? "Falha." };
    bumpAll();
    return { ok: true };
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_accounts")
    .delete()
    .eq("id", parsedId.data)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return { ok: false, error: error.message ?? "Falha ao excluir conta." };
  }
  bumpAll();
  return { ok: true };
}

/* ========================================================================== */
/* Categorias                                                                 */
/* ========================================================================== */

export async function createFinancialCategory(
  input: CategoryInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("financial_categories")
    .insert({
      tenant_id: ctx.tenantId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      parent_id: parsed.data.parentId ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao criar categoria." };
  }
  bumpAll();
  return { ok: true, id: data.id };
}

export async function updateFinancialCategory(
  input: CategoryUpdateInput,
): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_categories")
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind,
      parent_id: parsed.data.parentId ?? null,
      ...(parsed.data.isArchived !== undefined
        ? { is_archived: parsed.data.isArchived }
        : {}),
    })
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return {
      ok: false,
      error: error.message ?? "Falha ao atualizar categoria.",
    };
  }
  bumpAll();
  return { ok: true };
}

export async function deleteFinancialCategory(id: string): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Id inválido." };

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_categories")
    .update({ is_archived: true })
    .eq("id", parsedId.data)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return { ok: false, error: error.message ?? "Falha ao arquivar." };
  }
  bumpAll();
  return { ok: true };
}

/* ========================================================================== */
/* Formas de pagamento                                                        */
/* ========================================================================== */

export async function createFinancialPaymentMethod(
  input: PaymentMethodInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsed = paymentMethodInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("financial_payment_methods")
    .insert({
      tenant_id: ctx.tenantId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      default_account_id: parsed.data.defaultAccountId ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Falha ao criar forma de pagamento.",
    };
  }
  bumpAll();
  return { ok: true, id: data.id };
}

export async function updateFinancialPaymentMethod(
  input: PaymentMethodUpdateInput,
): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsed = paymentMethodUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_payment_methods")
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind,
      default_account_id: parsed.data.defaultAccountId ?? null,
      ...(parsed.data.isArchived !== undefined
        ? { is_archived: parsed.data.isArchived }
        : {}),
    })
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return { ok: false, error: error.message ?? "Falha ao atualizar." };
  }
  bumpAll();
  return { ok: true };
}

export async function deleteFinancialPaymentMethod(
  id: string,
): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Id inválido." };

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_payment_methods")
    .update({ is_archived: true })
    .eq("id", parsedId.data)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return { ok: false, error: error.message ?? "Falha ao arquivar." };
  }
  bumpAll();
  return { ok: true };
}

/* ========================================================================== */
/* Lançamentos (transactions)                                                 */
/* ========================================================================== */

export async function createFinancialTransaction(
  input: TransactionInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const status = parsed.data.status;
  const paidAt =
    status === "paid"
      ? parsed.data.paidAt ?? new Date().toISOString()
      : null;

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("financial_transactions")
    .insert({
      tenant_id: ctx.tenantId,
      kind: parsed.data.kind,
      status,
      amount_cents: parsed.data.amountCents,
      description: parsed.data.description ?? null,
      notes: parsed.data.notes ?? null,
      occurred_on: parsed.data.occurredOn,
      due_date: parsed.data.dueDate ?? null,
      paid_at: paidAt,
      account_id: parsed.data.accountId ?? null,
      category_id: parsed.data.categoryId ?? null,
      payment_method_id: parsed.data.paymentMethodId ?? null,
      client_id: parsed.data.clientId ?? null,
      responsible_profile_id: parsed.data.responsibleProfileId ?? null,
      source_kind: "manual",
      source_id: null,
    })
    .select("id")
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Falha ao criar lançamento.",
    };
  }
  bumpAll();
  return { ok: true, id: data.id };
}

export async function updateFinancialTransaction(
  input: TransactionUpdateInput,
): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;

  const parsed = transactionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  // Carrega original para verificar se é manual ou automática.
  const { data: existing } = await ctx.supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("id, source_kind")
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!existing) {
    return { ok: false, error: "Lançamento não encontrado." };
  }

  const isAutomatic =
    existing.source_kind && existing.source_kind !== "manual";

  // Em lançamentos automáticos, só permite alterar status/datas/conta/forma pgto.
  // Os valores e a categoria refletem a fonte e devem ser ajustados lá.
  const updatePayload: Record<string, unknown> = {
    status: parsed.data.status,
    occurred_on: parsed.data.occurredOn,
    due_date: parsed.data.dueDate ?? null,
    paid_at:
      parsed.data.status === "paid"
        ? parsed.data.paidAt ?? new Date().toISOString()
        : null,
    account_id: parsed.data.accountId ?? null,
    payment_method_id: parsed.data.paymentMethodId ?? null,
    notes: parsed.data.notes ?? null,
  };

  if (!isAutomatic) {
    updatePayload.kind = parsed.data.kind;
    updatePayload.amount_cents = parsed.data.amountCents;
    updatePayload.description = parsed.data.description ?? null;
    updatePayload.category_id = parsed.data.categoryId ?? null;
    updatePayload.client_id = parsed.data.clientId ?? null;
    updatePayload.responsible_profile_id =
      parsed.data.responsibleProfileId ?? null;
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_transactions")
    .update(updatePayload)
    .eq("id", parsed.data.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return {
      ok: false,
      error: error.message ?? "Falha ao atualizar lançamento.",
    };
  }
  bumpAll();
  return { ok: true };
}

/**
 * Marca como pago um lançamento pendente (atalho do dashboard de contas a
 * receber/pagar). Não permite "despagar" — para isso, edite o lançamento.
 */
export async function markFinancialTransactionPaid(
  id: string,
): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Id inválido." };

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_transactions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", parsedId.data)
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "pending");
  if (error) {
    return { ok: false, error: error.message ?? "Falha ao marcar como pago." };
  }
  bumpAll();
  return { ok: true };
}

export async function deleteFinancialTransaction(
  id: string,
): Promise<Ok | Err> {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) return ctx;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Id inválido." };

  // Lançamentos automáticos não podem ser excluídos — só cancelados pela ação
  // que os criou. Mantemos histórico íntegro.
  const { data: existing } = await ctx.supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("source_kind")
    .eq("id", parsedId.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Lançamento não encontrado." };
  if (existing.source_kind && existing.source_kind !== "manual") {
    return {
      ok: false,
      error:
        "Lançamento automático não pode ser excluído — cancele a venda/orçamento que o gerou.",
    };
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("financial_transactions")
    .delete()
    .eq("id", parsedId.data)
    .eq("tenant_id", ctx.tenantId);
  if (error) {
    return { ok: false, error: error.message ?? "Falha ao excluir." };
  }
  bumpAll();
  return { ok: true };
}
