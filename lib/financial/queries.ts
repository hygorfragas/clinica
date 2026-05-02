/**
 * Queries de leitura para o módulo financeiro.
 * Não são server actions — são utilitários chamados por server components.
 */

import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";

export type AccountRow = {
  id: string;
  name: string;
  kind: "cash" | "bank" | "wallet" | "other";
  opening_balance_cents: number;
  is_archived: boolean;
  notes: string | null;
};

export type AccountWithBalance = AccountRow & {
  /** Saldo calculado (opening + entradas pagas − saídas pagas). */
  balance_cents: number;
};

export type CategoryRow = {
  id: string;
  name: string;
  kind: "income" | "expense";
  parent_id: string | null;
  is_archived: boolean;
};

export type PaymentMethodRow = {
  id: string;
  name: string;
  kind:
    | "cash"
    | "pix"
    | "debit_card"
    | "credit_card"
    | "bank_transfer"
    | "other";
  default_account_id: string | null;
  is_archived: boolean;
};

export type TransactionRow = {
  id: string;
  kind: "income" | "expense";
  status: "pending" | "paid" | "cancelled";
  amount_cents: number;
  description: string | null;
  notes: string | null;
  occurred_on: string;
  due_date: string | null;
  paid_at: string | null;
  account_id: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  client_id: string | null;
  responsible_profile_id: string | null;
  source_kind: string | null;
  source_id: string | null;
  reverses_transaction_id: string | null;
  created_at: string;
};

export async function listAccounts(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  opts?: { includeArchived?: boolean },
): Promise<AccountRow[]> {
  let query = supabase
    .schema("clinic")
    .from("financial_accounts")
    .select(
      "id, name, kind, opening_balance_cents, is_archived, notes",
    )
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  if (!opts?.includeArchived) {
    query = query.eq("is_archived", false);
  }
  const { data, error } = await query;
  if (error) {
    console.error("listAccounts", error);
    return [];
  }
  return (data ?? []) as AccountRow[];
}

export async function listAccountsWithBalance(
  supabase: ClinicSupabaseClient,
  tenantId: string,
): Promise<AccountWithBalance[]> {
  const accounts = await listAccounts(supabase, tenantId, {
    includeArchived: true,
  });
  if (accounts.length === 0) return [];

  const { data: txs } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("account_id, kind, amount_cents, status")
    .eq("tenant_id", tenantId)
    .eq("status", "paid");

  const byAccount = new Map<string, number>();
  for (const t of (txs ?? []) as Array<{
    account_id: string | null;
    kind: "income" | "expense";
    amount_cents: number;
  }>) {
    if (!t.account_id) continue;
    const sign = t.kind === "income" ? 1 : -1;
    byAccount.set(
      t.account_id,
      (byAccount.get(t.account_id) ?? 0) + sign * t.amount_cents,
    );
  }

  return accounts.map((a) => ({
    ...a,
    balance_cents: a.opening_balance_cents + (byAccount.get(a.id) ?? 0),
  }));
}

export async function listCategories(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  opts?: { includeArchived?: boolean },
): Promise<CategoryRow[]> {
  let query = supabase
    .schema("clinic")
    .from("financial_categories")
    .select("id, name, kind, parent_id, is_archived")
    .eq("tenant_id", tenantId)
    .order("kind", { ascending: true })
    .order("name", { ascending: true });
  if (!opts?.includeArchived) {
    query = query.eq("is_archived", false);
  }
  const { data, error } = await query;
  if (error) {
    console.error("listCategories", error);
    return [];
  }
  return (data ?? []) as CategoryRow[];
}

export async function listPaymentMethods(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  opts?: { includeArchived?: boolean },
): Promise<PaymentMethodRow[]> {
  let query = supabase
    .schema("clinic")
    .from("financial_payment_methods")
    .select("id, name, kind, default_account_id, is_archived")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  if (!opts?.includeArchived) {
    query = query.eq("is_archived", false);
  }
  const { data, error } = await query;
  if (error) {
    console.error("listPaymentMethods", error);
    return [];
  }
  return (data ?? []) as PaymentMethodRow[];
}

export type TransactionFilters = {
  from?: string; // YYYY-MM-DD
  to?: string;
  kind?: "income" | "expense";
  status?: "pending" | "paid" | "cancelled";
  accountId?: string;
  categoryId?: string;
  searchTerm?: string;
  limit?: number;
};

export async function listTransactions(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  filters: TransactionFilters = {},
): Promise<TransactionRow[]> {
  let q = supabase
    .schema("clinic")
    .from("financial_transactions")
    .select(
      "id, kind, status, amount_cents, description, notes, occurred_on, due_date, paid_at, account_id, category_id, payment_method_id, client_id, responsible_profile_id, source_kind, source_id, reverses_transaction_id, created_at",
    )
    .eq("tenant_id", tenantId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (filters.from) q = q.gte("occurred_on", filters.from);
  if (filters.to) q = q.lte("occurred_on", filters.to);
  if (filters.kind) q = q.eq("kind", filters.kind);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.accountId) q = q.eq("account_id", filters.accountId);
  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.searchTerm)
    q = q.ilike("description", `%${filters.searchTerm}%`);
  if (filters.limit) q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) {
    console.error("listTransactions", error);
    return [];
  }
  return (data ?? []) as TransactionRow[];
}

/* -------------------------------------------------------------------------- */
/* KPIs                                                                       */
/* -------------------------------------------------------------------------- */

export type FinancialKpis = {
  totalBalanceCents: number;
  monthIncomeCents: number;
  monthExpenseCents: number;
  monthResultCents: number;
  pendingReceivableCents: number;
  pendingPayableCents: number;
  trailing6: Array<{
    monthLabel: string;
    incomeCents: number;
    expenseCents: number;
  }>;
  topIncomeCategories: Array<{
    categoryId: string | null;
    categoryName: string;
    totalCents: number;
  }>;
  topExpenseCategories: Array<{
    categoryId: string | null;
    categoryName: string;
    totalCents: number;
  }>;
};

function monthBounds(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export async function loadFinancialKpis(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  reference: Date = new Date(),
): Promise<FinancialKpis> {
  const accounts = await listAccountsWithBalance(supabase, tenantId);
  const totalBalanceCents = accounts.reduce(
    (acc, a) => acc + a.balance_cents,
    0,
  );

  // Lançamentos do mês corrente (paid).
  const { start, end } = monthBounds(reference);
  const { data: monthTxs } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("kind, amount_cents, category_id, status")
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .gte("occurred_on", start)
    .lte("occurred_on", end);

  let monthIncome = 0;
  let monthExpense = 0;
  for (const t of (monthTxs ?? []) as Array<{
    kind: "income" | "expense";
    amount_cents: number;
    category_id: string | null;
  }>) {
    if (t.kind === "income") monthIncome += t.amount_cents;
    else monthExpense += t.amount_cents;
  }

  // Pendentes (contas a receber/pagar).
  const { data: pendingTxs } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("kind, amount_cents")
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  let receivable = 0;
  let payable = 0;
  for (const t of (pendingTxs ?? []) as Array<{
    kind: "income" | "expense";
    amount_cents: number;
  }>) {
    if (t.kind === "income") receivable += t.amount_cents;
    else payable += t.amount_cents;
  }

  // Trailing 6 meses.
  const trailing6: FinancialKpis["trailing6"] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const ref = new Date(
      reference.getFullYear(),
      reference.getMonth() - i,
      1,
    );
    const { start: s, end: e } = monthBounds(ref);
    const { data } = await supabase
      .schema("clinic")
      .from("financial_transactions")
      .select("kind, amount_cents")
      .eq("tenant_id", tenantId)
      .eq("status", "paid")
      .gte("occurred_on", s)
      .lte("occurred_on", e);
    let incC = 0;
    let expC = 0;
    for (const t of (data ?? []) as Array<{
      kind: "income" | "expense";
      amount_cents: number;
    }>) {
      if (t.kind === "income") incC += t.amount_cents;
      else expC += t.amount_cents;
    }
    trailing6.push({
      monthLabel: ref.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      }),
      incomeCents: incC,
      expenseCents: expC,
    });
  }

  // Top categorias do mês.
  const categoriesById = new Map<string, string>();
  const cats = await listCategories(supabase, tenantId, {
    includeArchived: true,
  });
  for (const c of cats) categoriesById.set(c.id, c.name);

  const incomeAgg = new Map<string | null, number>();
  const expenseAgg = new Map<string | null, number>();
  for (const t of (monthTxs ?? []) as Array<{
    kind: "income" | "expense";
    amount_cents: number;
    category_id: string | null;
  }>) {
    const target = t.kind === "income" ? incomeAgg : expenseAgg;
    target.set(t.category_id, (target.get(t.category_id) ?? 0) + t.amount_cents);
  }

  function topOf(
    agg: Map<string | null, number>,
    n = 5,
  ): FinancialKpis["topIncomeCategories"] {
    return Array.from(agg.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([categoryId, totalCents]) => ({
        categoryId,
        categoryName: categoryId
          ? categoriesById.get(categoryId) ?? "Sem categoria"
          : "Sem categoria",
        totalCents,
      }));
  }

  return {
    totalBalanceCents,
    monthIncomeCents: monthIncome,
    monthExpenseCents: monthExpense,
    monthResultCents: monthIncome - monthExpense,
    pendingReceivableCents: receivable,
    pendingPayableCents: payable,
    trailing6,
    topIncomeCategories: topOf(incomeAgg),
    topExpenseCategories: topOf(expenseAgg),
  };
}
