"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientPurchase } from "@/lib/clients/purchase-actions";

export type HistoricoCompraRow = {
  id: string;
  title: string;
  total_cents: number;
  currency: string;
  purchased_at: string;
  notes: string | null;
  responsible_name: string | null;
  budget_id: string | null;
};

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function PacienteHistoricoComprasPanel({
  clientId,
  rows,
  totalInvestidoCents,
  procedureOptions,
}: {
  clientId: string;
  rows: HistoricoCompraRow[];
  totalInvestidoCents: number;
  procedureOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          new Date(b.purchased_at).getTime() -
          new Date(a.purchased_at).getTime(),
      ),
    [rows],
  );

  function submitRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const totalStr = String(fd.get("total_reais") ?? "").trim().replace(",", ".");
    const total = Number.parseFloat(totalStr);
    const purchasedAt = String(fd.get("purchased_at") ?? "");
    const procedureId = String(fd.get("procedure_id") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();

    if (Number.isNaN(total) || total < 0) {
      setError("Informe um valor válido (ex.: 1500 ou 1500,50).");
      return;
    }

    startTransition(async () => {
      const result = await createClientPurchase({
        clientId,
        title,
        totalCents: Math.round(total * 100),
        purchasedAt: new Date(purchasedAt).toISOString(),
        contractDocumentId: null,
        procedureId: procedureId.length > 0 ? procedureId : null,
        notes: notes.length > 0 ? notes : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      e.currentTarget.reset();
      setOpenForm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[1.75rem] bg-gradient-to-br from-brand/12 to-transparent p-6 shadow-lift ring-1 ring-brand/20">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/80 p-2.5 shadow-sm ring-1 ring-line/60">
              <Wallet className="h-5 w-5 text-brand" aria-hidden />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Total investido
            </p>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-ink">
            {formatBRL(totalInvestidoCents)}
          </p>
        </div>
        <div className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-muted/60 p-2.5 ring-1 ring-line/50">
              <Receipt className="h-5 w-5 text-ink-muted" aria-hidden />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Lançamentos
            </p>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-ink">
            {rows.length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Histórico financeiro</h2>
          <p className="text-sm text-ink-muted">
            Valores registrados, origem (manual ou orçamento) e observações.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => {
            setOpenForm((value) => !value);
            setError(null);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {openForm ? "Fechar formulário" : "Registrar lançamento manual"}
        </Button>
      </div>

      {openForm ? (
        <form
          onSubmit={submitRegister}
          className="rounded-[1.75rem] border border-line/80 bg-muted/20 p-6 shadow-inner"
        >
          <h3 className="text-sm font-semibold text-ink">Novo lançamento</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reg_title">Descrição</Label>
              <Input
                id="reg_title"
                name="title"
                required
                placeholder="Ex.: Protocolo de microagulhamento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg_total">Valor (R$)</Label>
              <Input
                id="reg_total"
                name="total_reais"
                required
                inputMode="decimal"
                placeholder="1500,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg_when">Data e hora</Label>
              <Input
                id="reg_when"
                name="purchased_at"
                type="datetime-local"
                required
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg_proc">Procedimento do catálogo (opcional)</Label>
              <select
                id="reg_proc"
                name="procedure_id"
                className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                defaultValue=""
              >
                <option value="">—</option>
                {procedureOptions.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg_notes">Observações</Label>
              <Input
                id="reg_notes"
                name="notes"
                placeholder="Forma de pagamento, pacote, etc."
              />
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar lançamento"}
            </Button>
          </div>
        </form>
      ) : null}

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-muted/30 px-6 py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-ink-subtle" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">
            Nenhum lançamento financeiro registrado.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] ring-1 ring-line shadow-lift">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-muted/40 text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Descrição</th>
                <th className="px-4 py-3 font-semibold">Origem</th>
                <th className="px-4 py-3 font-semibold">Valor</th>
                <th className="px-4 py-3 font-semibold">Profissional</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line/70 transition-colors hover:bg-brand/[0.04]"
                >
                  <td className="whitespace-nowrap px-4 py-3.5 align-top text-ink tabular-nums">
                    {new Date(row.purchased_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <p className="font-medium text-ink">{row.title}</p>
                    {row.notes ? (
                      <p className="mt-1 text-xs text-ink-muted">{row.notes}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 align-top text-xs text-ink">
                    {row.budget_id ? "Orçamento aprovado" : "Lançamento manual"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 align-top font-semibold tabular-nums text-ink">
                    {formatBRL(row.total_cents)}
                  </td>
                  <td className="px-4 py-3.5 align-top text-xs text-ink">
                    {row.responsible_name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
