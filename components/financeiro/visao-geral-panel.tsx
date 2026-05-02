import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { centsToBrl } from "@/lib/financial/schemas";
import type {
  AccountWithBalance,
  FinancialKpis,
} from "@/lib/financial/queries";
import { cn } from "@/lib/utils";

type Props = {
  accounts: AccountWithBalance[];
  kpis: FinancialKpis;
};

export function VisaoGeralPanel({ accounts, kpis }: Props) {
  const positiveResult = kpis.monthResultCents >= 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Saldo total"
          value={centsToBrl(kpis.totalBalanceCents)}
          icon={<Wallet className="h-4 w-4" aria-hidden />}
          tone="brand"
          description={`${accounts.filter((a) => !a.is_archived).length} conta(s) ativa(s)`}
        />
        <KpiCard
          title="Receitas no mês"
          value={centsToBrl(kpis.monthIncomeCents)}
          icon={<ArrowUpRight className="h-4 w-4" aria-hidden />}
          tone="income"
        />
        <KpiCard
          title="Despesas no mês"
          value={centsToBrl(kpis.monthExpenseCents)}
          icon={<ArrowDownRight className="h-4 w-4" aria-hidden />}
          tone="expense"
        />
        <KpiCard
          title="Resultado do mês"
          value={centsToBrl(kpis.monthResultCents)}
          icon={<PiggyBank className="h-4 w-4" aria-hidden />}
          tone={positiveResult ? "income" : "expense"}
          description={positiveResult ? "Lucro" : "Prejuízo"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              Receitas vs despesas — últimos 6 meses
            </h2>
            <span className="text-[11px] text-ink-subtle">
              somente lançamentos pagos
            </span>
          </header>
          <TrailingChart data={kpis.trailing6} />
        </div>

        <div className="space-y-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Pendências</h2>
            <Link
              href="/financeiro/relatorios"
              className="text-xs font-medium text-brand hover:underline"
            >
              Ver detalhes →
            </Link>
          </header>
          <PendingRow
            label="A receber"
            value={kpis.pendingReceivableCents}
            tone="income"
          />
          <PendingRow
            label="A pagar"
            value={kpis.pendingPayableCents}
            tone="expense"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <CategoryRanking
          title="Top receitas do mês"
          items={kpis.topIncomeCategories}
          tone="income"
        />
        <CategoryRanking
          title="Top despesas do mês"
          items={kpis.topExpenseCategories}
          tone="expense"
        />
      </section>

      <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Saldo por conta</h2>
          <Link
            href="/financeiro/contas"
            className="text-xs font-medium text-brand hover:underline"
          >
            Gerenciar →
          </Link>
        </header>
        {accounts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-ink-muted">
            Nenhuma conta cadastrada ainda.{" "}
            <Link
              href="/financeiro/contas"
              className="font-medium text-brand hover:underline"
            >
              Criar primeira conta
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-xl bg-canvas p-3 ring-1",
                  a.is_archived
                    ? "opacity-50 ring-line/60"
                    : "ring-line/70",
                )}
              >
                <p className="text-xs uppercase tracking-wide text-ink-subtle">
                  {a.kind === "cash"
                    ? "Caixa"
                    : a.kind === "bank"
                      ? "Banco"
                      : a.kind === "wallet"
                        ? "Carteira"
                        : "Outra"}
                </p>
                <p className="text-sm font-semibold text-ink">{a.name}</p>
                <p
                  className={cn(
                    "mt-1 text-base font-semibold",
                    a.balance_cents >= 0 ? "text-ink" : "text-danger",
                  )}
                >
                  {centsToBrl(a.balance_cents)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function KpiCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  tone: "brand" | "income" | "expense";
}) {
  const toneClass =
    tone === "income"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : tone === "expense"
        ? "text-rose-700 bg-rose-50 ring-rose-200"
        : "text-brand bg-brand/10 ring-brand/20";
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full ring-1",
            toneClass,
          )}
        >
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {title}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
      {description ? (
        <p className="mt-1 text-[11px] text-ink-subtle">{description}</p>
      ) : null}
    </div>
  );
}

function PendingRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
}) {
  const color =
    tone === "income" ? "text-emerald-700" : "text-rose-700";
  return (
    <div className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 ring-1 ring-line/70">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={cn("text-sm font-semibold", color)}>
        {centsToBrl(value)}
      </span>
    </div>
  );
}

function TrailingChart({
  data,
}: {
  data: FinancialKpis["trailing6"];
}) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.incomeCents, d.expenseCents]),
  );
  return (
    <div className="grid grid-cols-6 items-end gap-2 px-1 pt-2">
      {data.map((d) => (
        <div key={d.monthLabel} className="flex flex-col items-center gap-1">
          <div className="flex h-32 w-full items-end gap-0.5">
            <div
              className="flex-1 rounded-t bg-emerald-500/80"
              style={{ height: `${(d.incomeCents / max) * 100}%` }}
              title={`Receitas: ${centsToBrl(d.incomeCents)}`}
            />
            <div
              className="flex-1 rounded-t bg-rose-500/80"
              style={{ height: `${(d.expenseCents / max) * 100}%` }}
              title={`Despesas: ${centsToBrl(d.expenseCents)}`}
            />
          </div>
          <span className="text-[10px] text-ink-subtle">{d.monthLabel}</span>
        </div>
      ))}
    </div>
  );
}

function CategoryRanking({
  title,
  items,
  tone,
}: {
  title: string;
  items: FinancialKpis["topIncomeCategories"];
  tone: "income" | "expense";
}) {
  const totalAll = items.reduce((acc, i) => acc + i.totalCents, 0) || 1;
  const colorBar =
    tone === "income" ? "bg-emerald-500" : "bg-rose-500";
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhum lançamento no período.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => {
            const pct = (i.totalCents / totalAll) * 100;
            return (
              <li key={i.categoryId ?? "none"} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm text-ink">
                    {i.categoryName}
                  </span>
                  <span className="text-sm font-medium text-ink-muted">
                    {centsToBrl(i.totalCents)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full", colorBar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
