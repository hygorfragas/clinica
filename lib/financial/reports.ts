/**
 * Queries de relatório (DRE simplificado, contas a receber/pagar,
 * receita por procedimento e por profissional).
 */

import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";

function monthBounds(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export type DreRow = {
  categoryId: string | null;
  categoryName: string;
  totalCents: number;
};

export type DreReport = {
  start: string;
  end: string;
  income: DreRow[];
  expense: DreRow[];
  totalIncomeCents: number;
  totalExpenseCents: number;
  resultCents: number;
};

export async function loadDreReport(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  ref: { from: string; to: string },
): Promise<DreReport> {
  const { data: txs } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("kind, amount_cents, category_id")
    .eq("tenant_id", tenantId)
    .eq("status", "paid")
    .gte("occurred_on", ref.from)
    .lte("occurred_on", ref.to);

  const { data: cats } = await supabase
    .schema("clinic")
    .from("financial_categories")
    .select("id, name")
    .eq("tenant_id", tenantId);
  const catName = new Map<string, string>();
  for (const c of (cats ?? []) as Array<{ id: string; name: string }>) {
    catName.set(c.id, c.name);
  }

  const income = new Map<string | null, number>();
  const expense = new Map<string | null, number>();
  for (const t of (txs ?? []) as Array<{
    kind: "income" | "expense";
    amount_cents: number;
    category_id: string | null;
  }>) {
    const target = t.kind === "income" ? income : expense;
    target.set(t.category_id, (target.get(t.category_id) ?? 0) + t.amount_cents);
  }

  function toRows(map: Map<string | null, number>): DreRow[] {
    return Array.from(map.entries())
      .map(([categoryId, totalCents]) => ({
        categoryId,
        categoryName: categoryId
          ? catName.get(categoryId) ?? "Sem categoria"
          : "Sem categoria",
        totalCents,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  const incomeRows = toRows(income);
  const expenseRows = toRows(expense);
  const totalIncomeCents = incomeRows.reduce(
    (acc, r) => acc + r.totalCents,
    0,
  );
  const totalExpenseCents = expenseRows.reduce(
    (acc, r) => acc + r.totalCents,
    0,
  );

  return {
    start: ref.from,
    end: ref.to,
    income: incomeRows,
    expense: expenseRows,
    totalIncomeCents,
    totalExpenseCents,
    resultCents: totalIncomeCents - totalExpenseCents,
  };
}

export type PendingItem = {
  id: string;
  description: string | null;
  occurred_on: string;
  due_date: string | null;
  amount_cents: number;
  source_kind: string | null;
  client_id: string | null;
  client_name?: string | null;
};

export async function loadPendingTransactions(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  kind: "income" | "expense",
): Promise<PendingItem[]> {
  const { data: txs } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .select(
      "id, description, occurred_on, due_date, amount_cents, source_kind, client_id",
    )
    .eq("tenant_id", tenantId)
    .eq("kind", kind)
    .eq("status", "pending")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("occurred_on", { ascending: true });

  const list = (txs ?? []) as PendingItem[];
  if (list.length === 0) return list;

  const clientIds = Array.from(
    new Set(list.map((t) => t.client_id).filter(Boolean) as string[]),
  );
  if (clientIds.length === 0) return list;

  const { data: clients } = await supabase
    .schema("clinic")
    .from("clients")
    .select("id, full_name")
    .eq("tenant_id", tenantId)
    .in("id", clientIds);
  const nameById = new Map<string, string>();
  for (const c of (clients ?? []) as Array<{
    id: string;
    full_name: string;
  }>) {
    nameById.set(c.id, c.full_name);
  }
  return list.map((t) => ({
    ...t,
    client_name: t.client_id ? nameById.get(t.client_id) ?? null : null,
  }));
}

export type RevenueByProcedureRow = {
  procedureId: string | null;
  procedureName: string;
  saleCount: number;
  totalCents: number;
};

export async function loadRevenueByProcedure(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  ref: { from: string; to: string },
): Promise<RevenueByProcedureRow[]> {
  const { data: purchases } = await supabase
    .schema("clinic")
    .from("client_procedure_purchases")
    .select("id, procedure_id, total_cents, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", `${ref.from}T00:00:00`)
    .lte("created_at", `${ref.to}T23:59:59`);

  type PurchaseRow = {
    id: string;
    procedure_id: string | null;
    total_cents: number | null;
  };

  const list = (purchases ?? []) as PurchaseRow[];
  const procIds = Array.from(
    new Set(list.map((p) => p.procedure_id).filter(Boolean) as string[]),
  );
  const nameById = new Map<string, string>();
  if (procIds.length > 0) {
    const { data: procs } = await supabase
      .schema("clinic")
      .from("procedures")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .in("id", procIds);
    for (const p of (procs ?? []) as Array<{ id: string; name: string }>) {
      nameById.set(p.id, p.name);
    }
  }

  const agg = new Map<
    string | null,
    { count: number; total: number; name: string }
  >();
  for (const p of list) {
    const k = p.procedure_id;
    const name = k ? nameById.get(k) ?? "—" : "Avulso";
    const cur = agg.get(k) ?? { count: 0, total: 0, name };
    cur.count += 1;
    cur.total += p.total_cents ?? 0;
    cur.name = name;
    agg.set(k, cur);
  }

  return Array.from(agg.entries())
    .map(([procedureId, v]) => ({
      procedureId,
      procedureName: v.name,
      saleCount: v.count,
      totalCents: v.total,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export type RevenueByProfileRow = {
  profileId: string | null;
  profileName: string;
  count: number;
  totalCents: number;
};

export async function loadRevenueByProfile(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  ref: { from: string; to: string },
): Promise<RevenueByProfileRow[]> {
  const { data: txs } = await supabase
    .schema("clinic")
    .from("financial_transactions")
    .select("amount_cents, responsible_profile_id")
    .eq("tenant_id", tenantId)
    .eq("kind", "income")
    .eq("status", "paid")
    .gte("occurred_on", ref.from)
    .lte("occurred_on", ref.to);

  type TxRow = {
    amount_cents: number;
    responsible_profile_id: string | null;
  };

  const list = (txs ?? []) as TxRow[];
  const profileIds = Array.from(
    new Set(
      list
        .map((t) => t.responsible_profile_id)
        .filter(Boolean) as string[],
    ),
  );
  const nameById = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profs } = await supabase
      .schema("clinic")
      .from("profiles")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .in("id", profileIds);
    for (const p of (profs ?? []) as Array<{
      id: string;
      full_name: string | null;
    }>) {
      nameById.set(p.id, p.full_name ?? "Sem nome");
    }
  }

  const agg = new Map<
    string | null,
    { count: number; total: number; name: string }
  >();
  for (const t of list) {
    const k = t.responsible_profile_id;
    const name = k ? nameById.get(k) ?? "—" : "Sem responsável";
    const cur = agg.get(k) ?? { count: 0, total: 0, name };
    cur.count += 1;
    cur.total += t.amount_cents;
    cur.name = name;
    agg.set(k, cur);
  }

  return Array.from(agg.entries())
    .map(([profileId, v]) => ({
      profileId,
      profileName: v.name,
      count: v.count,
      totalCents: v.total,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export function defaultMonthRange(): { from: string; to: string } {
  const now = new Date();
  const { start, end } = monthBounds(now);
  return { from: start, to: end };
}
