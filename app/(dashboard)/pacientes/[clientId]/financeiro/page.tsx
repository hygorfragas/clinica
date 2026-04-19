import { notFound } from "next/navigation";
import {
  PacienteHistoricoComprasPanel,
  type HistoricoCompraRow,
} from "@/components/clients/paciente-historico-compras-panel";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function PacienteFinanceiroPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const [purchasesRes, proceduresRes, budgetsRes] = await Promise.all([
    ctx.supabase
      .schema("clinic")
      .from("client_procedure_purchases")
      .select(
        "id, title, total_cents, currency, purchased_at, notes, responsible_profile_id, budget_id",
      )
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .order("purchased_at", { ascending: false }),
    ctx.supabase
      .schema("clinic")
      .from("procedures")
      .select("id, name")
      .eq("tenant_id", ctx.tenantId)
      .order("name", { ascending: true }),
    ctx.supabase
      .schema("clinic")
      .from("budgets")
      .select("id, title, status, total_cents, created_at, valid_until")
      .eq("tenant_id", ctx.tenantId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ]);

  if (purchasesRes.error || proceduresRes.error || budgetsRes.error) {
    return (
      <p className="text-sm text-danger">
        Não foi possível carregar os dados financeiros.
      </p>
    );
  }

  const purchases = purchasesRes.data ?? [];
  const budgets = budgetsRes.data ?? [];

  const responsibleIds = [
    ...new Set(
      purchases
        .map((p) => p.responsible_profile_id)
        .filter((x): x is string => typeof x === "string"),
    ),
  ];
  let responsibles: { id: string; full_name: string }[] = [];
  if (responsibleIds.length > 0) {
    const { data: profRows } = await ctx.supabase
      .schema("clinic")
      .from("profiles")
      .select("id, full_name")
      .in("id", responsibleIds);
    responsibles = profRows ?? [];
  }

  const nameByProfile = new Map(responsibles.map((p) => [p.id, p.full_name]));

  const historicoRows: HistoricoCompraRow[] = purchases.map((purchase) => ({
    id: purchase.id,
    title: purchase.title,
    total_cents: purchase.total_cents,
    currency: purchase.currency,
    purchased_at: purchase.purchased_at,
    notes: purchase.notes,
    responsible_name: purchase.responsible_profile_id
      ? nameByProfile.get(purchase.responsible_profile_id) ?? null
      : null,
    budget_id: purchase.budget_id,
  }));

  const totalInvestidoCents = purchases.reduce((s, p) => s + p.total_cents, 0);
  const qtdCompras = purchases.length;
  const ultimaCompra = purchases[0]?.purchased_at ?? null;
  const totalOrcadoCents = budgets.reduce(
    (sum, budget) => sum + (budget.total_cents ?? 0),
    0,
  );

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
          Financeiro da paciente
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          Visão financeira objetiva da paciente: lançamentos efetivos, totais e
          orçamentos associados. Documentos e anexos ficam na aba{" "}
          <strong className="font-medium text-ink">Anexos</strong>.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Total investido
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {BRL.format(totalInvestidoCents / 100)}
          </p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Procedimentos adquiridos
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{qtdCompras}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Último lançamento
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {ultimaCompra
              ? new Date(ultimaCompra).toLocaleDateString("pt-BR")
              : "—"}
          </p>
        </div>
      </section>

      <PacienteHistoricoComprasPanel
        clientId={clientId}
        rows={historicoRows}
        totalInvestidoCents={totalInvestidoCents}
        procedureOptions={proceduresRes.data ?? []}
      />

      <section className="space-y-4 border-t border-line/80 pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Orçamentos da paciente
          </h3>
          <p className="text-sm text-ink-muted">
            Total orçado:{" "}
            <strong className="font-medium text-ink">
              {BRL.format(totalOrcadoCents / 100)}
            </strong>
          </p>
        </div>
        {budgets.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Ainda não há orçamento gerado para esta paciente.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl ring-1 ring-line/80">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-muted/35 text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Título</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Validade</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr
                    key={budget.id}
                    className="border-b border-line/70 transition-colors hover:bg-brand/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 text-ink tabular-nums">
                      {new Date(budget.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5 text-ink">
                      {budget.title?.trim() || "Orçamento sem título"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink-muted">
                      {budget.status === "approved"
                        ? "Aprovado"
                        : budget.status === "sent"
                          ? "Enviado"
                          : budget.status === "cancelled"
                            ? "Cancelado"
                            : "Rascunho"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink-muted">
                      {budget.valid_until
                        ? new Date(budget.valid_until).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-ink">
                      {BRL.format((budget.total_cents ?? 0) / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
