/**
 * Dispatcher financeiro: traduz eventos do sistema (venda registrada, orçamento
 * aprovado, parcela paga, cancelamento) em lançamentos em
 * `clinic.financial_transactions`. Idempotente via (source_kind, source_id).
 *
 * Importante: estas funções recebem o supabase client + tenantId já validados
 * pelo CHAMADOR (geralmente uma server action do módulo de origem). Não
 * precisam ser server actions; são utilitários puros.
 */

import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";
import type { TransactionSourceKind } from "./schemas";

type DispatchResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Cria (ou retorna a existente) uma transação automática vinculada à origem.
 * Idempotente: se já existir uma transação ATIVA para (source_kind, source_id),
 * retorna o id dela sem criar nova.
 */
async function ensureTransaction(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  args: {
    sourceKind: TransactionSourceKind;
    sourceId: string;
    kind: "income" | "expense";
    status: "pending" | "paid";
    amountCents: number;
    description: string;
    occurredOn: string;
    clientId?: string | null;
    responsibleProfileId?: string | null;
    categoryId?: string | null;
    accountId?: string | null;
    paymentMethodId?: string | null;
  },
): Promise<DispatchResult> {
  // Busca existente.
  const { data: existing } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("source_kind", args.sourceKind)
    .eq("source_id", args.sourceId)
    .neq("status", "cancelled")
    .is("reverses_transaction_id", null)
    .maybeSingle();
  if (existing) {
    return { ok: true, id: existing.id };
  }

  const { data, error } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .insert({
      tenant_id: tenantId,
      kind: args.kind,
      status: args.status,
      amount_cents: args.amountCents,
      description: args.description,
      occurred_on: args.occurredOn,
      paid_at: args.status === "paid" ? new Date().toISOString() : null,
      account_id: args.accountId ?? null,
      category_id: args.categoryId ?? null,
      payment_method_id: args.paymentMethodId ?? null,
      client_id: args.clientId ?? null,
      responsible_profile_id: args.responsibleProfileId ?? null,
      source_kind: args.sourceKind,
      source_id: args.sourceId,
    })
    .select("id")
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Falha ao registrar lançamento financeiro.",
    };
  }
  return { ok: true, id: data.id };
}

/**
 * Lança um contra-lançamento (estorno) referente a uma transação previamente
 * registrada por origem. Marca a original como "cancelled" e cria uma nova
 * transação inversa apontando para ela via reverses_transaction_id.
 * Idempotente: se já tiver sido estornada, no-op.
 */
async function reverseTransactionBySource(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  args: {
    sourceKind: TransactionSourceKind;
    sourceId: string;
    reason?: string;
  },
): Promise<DispatchResult | { ok: true; id: null }> {
  const { data: original } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .select(
      "id, kind, amount_cents, account_id, category_id, payment_method_id, client_id, responsible_profile_id",
    )
    .eq("tenant_id", tenantId)
    .eq("source_kind", args.sourceKind)
    .eq("source_id", args.sourceId)
    .neq("status", "cancelled")
    .is("reverses_transaction_id", null)
    .maybeSingle();
  if (!original) return { ok: true, id: null };

  // Marca original como cancelada.
  await supabase
    .schema("clinic")
    .from("financial_transactions")
    .update({ status: "cancelled" })
    .eq("id", original.id)
    .eq("tenant_id", tenantId);

  // Cria estorno (kind invertido).
  const reverseKind = original.kind === "income" ? "expense" : "income";
  const { data: reversal, error } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .insert({
      tenant_id: tenantId,
      kind: reverseKind,
      status: "paid",
      amount_cents: original.amount_cents,
      description: args.reason ?? "Estorno automático",
      occurred_on: new Date().toISOString().slice(0, 10),
      paid_at: new Date().toISOString(),
      account_id: original.account_id,
      category_id: original.category_id,
      payment_method_id: original.payment_method_id,
      client_id: original.client_id,
      responsible_profile_id: original.responsible_profile_id,
      source_kind: "reversal",
      source_id: original.id,
      reverses_transaction_id: original.id,
    })
    .select("id")
    .single();
  if (error || !reversal) {
    return {
      ok: false,
      error: error?.message ?? "Falha ao estornar lançamento.",
    };
  }
  return { ok: true, id: reversal.id };
}

/* ========================================================================== */
/* Vendas                                                                     */
/* ========================================================================== */

/**
 * Registra uma venda como income. Não falha o fluxo de venda se algo der errado
 * aqui — só loga e segue, porque vender > registrar contábil.
 */
export async function dispatchSaleCreated(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  sale: {
    id: string;
    title: string | null;
    total_cents: number;
    client_id: string | null;
    occurred_on?: string | null;
    responsible_profile_id?: string | null;
  },
): Promise<void> {
  if (!sale.total_cents || sale.total_cents <= 0) return;
  const occurredOn =
    sale.occurred_on ?? new Date().toISOString().slice(0, 10);
  const description = sale.title ? `Venda: ${sale.title}` : "Venda";

  const result = await ensureTransaction(supabase, tenantId, {
    sourceKind: "sale",
    sourceId: sale.id,
    kind: "income",
    status: "paid",
    amountCents: sale.total_cents,
    description,
    occurredOn,
    clientId: sale.client_id,
    responsibleProfileId: sale.responsible_profile_id ?? null,
  });
  if (!result.ok) {
    console.error("[financial.dispatcher] sale created:", result.error);
  }
}

export async function dispatchSaleCancelled(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  saleId: string,
  reason?: string,
): Promise<void> {
  const result = await reverseTransactionBySource(supabase, tenantId, {
    sourceKind: "sale",
    sourceId: saleId,
    reason: reason ?? "Venda cancelada",
  });
  if (!result.ok) {
    console.error("[financial.dispatcher] sale cancelled:", result.error);
  }
}

/* ========================================================================== */
/* Orçamentos / parcelas                                                      */
/* ========================================================================== */

export async function dispatchBudgetApproved(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  budget: {
    id: string;
    title: string | null;
    total_cents: number;
    client_id: string | null;
  },
): Promise<void> {
  if (!budget.total_cents || budget.total_cents <= 0) return;
  const description = budget.title
    ? `Orçamento aprovado: ${budget.title}`
    : "Orçamento aprovado";
  const result = await ensureTransaction(supabase, tenantId, {
    sourceKind: "budget",
    sourceId: budget.id,
    kind: "income",
    status: "pending",
    amountCents: budget.total_cents,
    description,
    occurredOn: new Date().toISOString().slice(0, 10),
    clientId: budget.client_id,
  });
  if (!result.ok) {
    console.error("[financial.dispatcher] budget approved:", result.error);
  }
}

export async function dispatchBudgetCancelled(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  budgetId: string,
  reason?: string,
): Promise<void> {
  const result = await reverseTransactionBySource(supabase, tenantId, {
    sourceKind: "budget",
    sourceId: budgetId,
    reason: reason ?? "Orçamento cancelado",
  });
  if (!result.ok) {
    console.error("[financial.dispatcher] budget cancelled:", result.error);
  }
}

/* ========================================================================== */
/* Compras / procedimentos (ficha da paciente)                                */
/* ========================================================================== */

export async function dispatchProcedurePurchaseCreated(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  purchase: {
    id: string;
    title: string | null;
    total_cents: number;
    client_id: string | null;
    occurred_on?: string | null;
    responsible_profile_id?: string | null;
  },
): Promise<void> {
  if (!purchase.total_cents || purchase.total_cents <= 0) return;
  const occurredOn = purchase.occurred_on ?? new Date().toISOString().slice(0, 10);
  const description = purchase.title
    ? `Compra de procedimento: ${purchase.title}`
    : "Compra de procedimento";

  const result = await ensureTransaction(supabase, tenantId, {
    sourceKind: "procedure_purchase",
    sourceId: purchase.id,
    kind: "income",
    status: "paid",
    amountCents: purchase.total_cents,
    description,
    occurredOn,
    clientId: purchase.client_id,
    responsibleProfileId: purchase.responsible_profile_id ?? null,
  });
  if (!result.ok) {
    console.error("[financial.dispatcher] procedure purchase created:", result.error);
  }
}

export async function dispatchProcedurePurchaseCancelled(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  purchaseId: string,
  reason?: string,
): Promise<void> {
  const result = await reverseTransactionBySource(supabase, tenantId, {
    sourceKind: "procedure_purchase",
    sourceId: purchaseId,
    reason: reason ?? "Compra de procedimento cancelada",
  });
  if (!result.ok) {
    console.error("[financial.dispatcher] procedure purchase cancelled:", result.error);
  }
}
