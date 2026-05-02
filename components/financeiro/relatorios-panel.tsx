"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarRange, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToBrl } from "@/lib/financial/schemas";
import type {
  DreReport,
  PendingItem,
  RevenueByProcedureRow,
  RevenueByProfileRow,
} from "@/lib/financial/reports";
import { cn } from "@/lib/utils";

type Props = {
  range: { from: string; to: string };
  dre: DreReport;
  receivables: PendingItem[];
  payables: PendingItem[];
  byProcedure: RevenueByProcedureRow[];
  byProfile: RevenueByProfileRow[];
};

export function RelatoriosPanel({
  range,
  dre,
  receivables,
  payables,
  byProcedure,
  byProfile,
}: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  function applyRange() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.replace(
      `/financeiro/relatorios${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  return (
    <div className="space-y-5">
      {/* Range */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyRange();
        }}
        className="flex flex-wrap items-end gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line"
      >
        <CalendarRange className="h-4 w-4 text-ink-muted" />
        <div className="space-y-1">
          <Label className="text-[10px] uppercase">De</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase">Até</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm">
          Atualizar
        </Button>
      </form>

      {/* DRE simplificado */}
      <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              DRE simplificado
            </h2>
            <p className="text-xs text-ink-muted">
              Período: {fmtRange(dre.start, dre.end)} · regime de caixa
              (lançamentos pagos)
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md bg-canvas px-3 text-xs font-medium text-ink-muted ring-1 ring-line/70 hover:text-ink"
            onClick={() => exportDreCsv(dre)}
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </header>
        <div className="grid gap-4 lg:grid-cols-2">
          <DreColumn title="Receitas" rows={dre.income} tone="income" />
          <DreColumn title="Despesas" rows={dre.expense} tone="expense" />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
          <SummaryCard label="Receita total" value={dre.totalIncomeCents} tone="income" />
          <SummaryCard label="Despesa total" value={dre.totalExpenseCents} tone="expense" />
          <SummaryCard
            label="Resultado"
            value={dre.resultCents}
            tone={dre.resultCents >= 0 ? "income" : "expense"}
            bold
          />
        </div>
      </section>

      {/* Pendências */}
      <section className="grid gap-4 lg:grid-cols-2">
        <PendingTable
          title="Contas a receber"
          items={receivables}
          tone="income"
        />
        <PendingTable
          title="Contas a pagar"
          items={payables}
          tone="expense"
        />
      </section>

      {/* Receita por procedimento */}
      <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Receita por procedimento
        </h2>
        {byProcedure.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhuma venda no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase text-ink-subtle">
                <tr className="border-b border-line/70">
                  <th className="px-2 py-1.5 text-left">Procedimento</th>
                  <th className="px-2 py-1.5 text-right">Vendas</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {byProcedure.map((r) => (
                  <tr
                    key={r.procedureId ?? "none"}
                    className="border-b border-line/60"
                  >
                    <td className="px-2 py-2 text-ink">{r.procedureName}</td>
                    <td className="px-2 py-2 text-right text-ink-muted">
                      {r.saleCount}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-emerald-700">
                      {centsToBrl(r.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Receita por profissional */}
      <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Receita por profissional
        </h2>
        {byProfile.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhuma receita atribuída no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase text-ink-subtle">
                <tr className="border-b border-line/70">
                  <th className="px-2 py-1.5 text-left">Profissional</th>
                  <th className="px-2 py-1.5 text-right">Lançamentos</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {byProfile.map((r) => (
                  <tr
                    key={r.profileId ?? "none"}
                    className="border-b border-line/60"
                  >
                    <td className="px-2 py-2 text-ink">{r.profileName}</td>
                    <td className="px-2 py-2 text-right text-ink-muted">
                      {r.count}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-emerald-700">
                      {centsToBrl(r.totalCents)}
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

/* -------------------------------------------------------------------------- */

function DreColumn({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: DreReport["income"];
  tone: "income" | "expense";
}) {
  const total = rows.reduce((acc, r) => acc + r.totalCents, 0);
  const colorBar = tone === "income" ? "bg-emerald-500" : "bg-rose-500";
  return (
    <div className="rounded-xl bg-canvas p-4 ring-1 ring-line/70">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Sem lançamentos.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm">
          {rows.map((r) => {
            const pct = total > 0 ? (r.totalCents / total) * 100 : 0;
            return (
              <li key={r.categoryId ?? "none"} className="space-y-0.5">
                <div className="flex justify-between gap-3">
                  <span className="truncate text-ink">{r.categoryName}</span>
                  <span className="text-ink-muted">
                    {centsToBrl(r.totalCents)}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
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

function SummaryCard({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
  bold?: boolean;
}) {
  const color =
    tone === "income" ? "text-emerald-700" : "text-rose-700";
  return (
    <div className="rounded-xl bg-canvas p-3 ring-1 ring-line/70">
      <p className="text-[11px] uppercase text-ink-subtle">{label}</p>
      <p
        className={cn(
          "mt-1 text-base",
          color,
          bold ? "text-lg font-semibold" : "font-medium",
        )}
      >
        {centsToBrl(value)}
      </p>
    </div>
  );
}

function PendingTable({
  title,
  items,
  tone,
}: {
  title: string;
  items: PendingItem[];
  tone: "income" | "expense";
}) {
  const total = items.reduce((acc, i) => acc + i.amount_cents, 0);
  const color = tone === "income" ? "text-emerald-700" : "text-rose-700";
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="text-[11px] text-ink-subtle">
            {items.length} pendência(s) · total{" "}
            <span className={color}>{centsToBrl(total)}</span>
          </p>
        </div>
      </header>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">Nada pendente.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-ink-subtle">
              <tr className="border-b border-line/70">
                <th className="px-2 py-1.5 text-left">Vencimento</th>
                <th className="px-2 py-1.5 text-left">Descrição</th>
                <th className="px-2 py-1.5 text-left">Paciente</th>
                <th className="px-2 py-1.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const overdue =
                  i.due_date &&
                  i.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <tr
                    key={i.id}
                    className="border-b border-line/60"
                  >
                    <td className="px-2 py-2 text-xs">
                      {i.due_date
                        ? new Date(
                            i.due_date + "T00:00:00",
                          ).toLocaleDateString("pt-BR")
                        : "—"}
                      {overdue ? (
                        <span className="ml-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-medium text-danger">
                          atrasado
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-ink">
                      {i.description ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-ink-muted">
                      {i.client_name ?? "—"}
                    </td>
                    <td className={cn("px-2 py-2 text-right font-semibold", color)}>
                      {centsToBrl(i.amount_cents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtRange(start: string, end: string): string {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
  return `${fmt(start)} a ${fmt(end)}`;
}

function exportDreCsv(dre: DreReport) {
  const rows: string[] = [];
  rows.push("tipo,categoria,valor_brl");
  for (const r of dre.income) {
    rows.push(`receita,${csvSafe(r.categoryName)},${(r.totalCents / 100).toFixed(2)}`);
  }
  for (const r of dre.expense) {
    rows.push(`despesa,${csvSafe(r.categoryName)},${(r.totalCents / 100).toFixed(2)}`);
  }
  rows.push(`total,RECEITA,${(dre.totalIncomeCents / 100).toFixed(2)}`);
  rows.push(`total,DESPESA,${(dre.totalExpenseCents / 100).toFixed(2)}`);
  rows.push(`total,RESULTADO,${(dre.resultCents / 100).toFixed(2)}`);
  const blob = new Blob([rows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dre-${dre.start}-a-${dre.end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvSafe(s: string): string {
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
