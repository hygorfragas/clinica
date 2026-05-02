"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFinancialTransaction,
  deleteFinancialTransaction,
  markFinancialTransactionPaid,
  updateFinancialTransaction,
} from "@/lib/financial/actions";
import type {
  AccountRow,
  CategoryRow,
  PaymentMethodRow,
  TransactionRow,
} from "@/lib/financial/queries";
import {
  centsToBrl,
  parseBrlToCents,
  TRANSACTION_STATUS_LABEL,
  type TransactionInput,
  type TransactionKind,
  type TransactionStatus,
} from "@/lib/financial/schemas";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";

type Filters = {
  from: string;
  to: string;
  kind: string;
  status: string;
  account: string;
  category: string;
  q: string;
};

type Props = {
  transactions: TransactionRow[];
  accounts: AccountRow[];
  categories: CategoryRow[];
  paymentMethods: PaymentMethodRow[];
  filters: Filters;
};

type Draft = {
  id: string | null;
  kind: TransactionKind;
  status: TransactionStatus;
  amountStr: string;
  description: string;
  occurredOn: string;
  dueDate: string;
  accountId: string;
  categoryId: string;
  paymentMethodId: string;
  notes: string;
  isAutomatic: boolean;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): Draft {
  return {
    id: null,
    kind: "income",
    status: "paid",
    amountStr: "0,00",
    description: "",
    occurredOn: todayStr(),
    dueDate: "",
    accountId: "",
    categoryId: "",
    paymentMethodId: "",
    notes: "",
    isAutomatic: false,
  };
}

export function LancamentosPanel({
  transactions,
  accounts,
  categories,
  paymentMethods,
  filters,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const totalIncome = transactions
    .filter((t) => t.kind === "income" && t.status === "paid")
    .reduce((acc, t) => acc + t.amount_cents, 0);
  const totalExpense = transactions
    .filter((t) => t.kind === "expense" && t.status === "paid")
    .reduce((acc, t) => acc + t.amount_cents, 0);

  function applyFilters(next: Filters) {
    const params = new URLSearchParams();
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.kind) params.set("kind", next.kind);
    if (next.status) params.set("status", next.status);
    if (next.account) params.set("account", next.account);
    if (next.category) params.set("category", next.category);
    if (next.q) params.set("q", next.q);
    router.replace(
      params.toString()
        ? `/financeiro/lancamentos?${params.toString()}`
        : "/financeiro/lancamentos",
    );
  }

  function clearFilters() {
    router.replace("/financeiro/lancamentos");
  }

  function openCreate() {
    setDraft(emptyDraft());
    setOpen(true);
  }
  function openEdit(t: TransactionRow) {
    setDraft({
      id: t.id,
      kind: t.kind,
      status: t.status,
      amountStr: (t.amount_cents / 100).toFixed(2).replace(".", ","),
      description: t.description ?? "",
      occurredOn: t.occurred_on,
      dueDate: t.due_date ?? "",
      accountId: t.account_id ?? "",
      categoryId: t.category_id ?? "",
      paymentMethodId: t.payment_method_id ?? "",
      notes: t.notes ?? "",
      isAutomatic: !!t.source_kind && t.source_kind !== "manual",
    });
    setOpen(true);
  }
  function close() {
    setOpen(false);
  }

  function save() {
    const amountCents = parseBrlToCents(draft.amountStr);
    if (amountCents <= 0) {
      notifyError(null, "Valor precisa ser maior que zero.");
      return;
    }
    if (!draft.description.trim()) {
      notifyError(null, "Adicione uma descrição.");
      return;
    }
    startTransition(async () => {
      const payload: TransactionInput = {
        kind: draft.kind,
        status: draft.status,
        amountCents,
        description: draft.description.trim(),
        notes: draft.notes.trim() || null,
        occurredOn: draft.occurredOn,
        dueDate: draft.dueDate || null,
        accountId: draft.accountId || null,
        categoryId: draft.categoryId || null,
        paymentMethodId: draft.paymentMethodId || null,
      };
      const result = draft.id
        ? await updateFinancialTransaction({ ...payload, id: draft.id })
        : await createFinancialTransaction(payload);
      if (!result.ok) {
        notifyError(null, result.error);
        return;
      }
      notifySuccess(draft.id ? "Lançamento atualizado." : "Lançamento criado.");
      close();
      router.refresh();
    });
  }

  function markPaid(id: string) {
    startTransition(async () => {
      const result = await markFinancialTransactionPaid(id);
      if (!result.ok) {
        notifyError(null, result.error);
        return;
      }
      notifySuccess("Marcado como pago.");
      router.refresh();
    });
  }

  function remove(t: TransactionRow) {
    confirm({
      title: "Excluir lançamento",
      description:
        "Esta ação remove o lançamento permanentemente. Para reverter um automático, cancele a venda/orçamento de origem.",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            const result = await deleteFinancialTransaction(t.id);
            if (!result.ok) {
              notifyError(null, result.error);
              reject(new Error(result.error));
              return;
            }
            notifySuccess("Lançamento removido.");
            router.refresh();
            resolve();
          });
        }),
    });
  }

  return (
    <div className="space-y-4">
      {confirmDialog}

      {/* Filtros */}
      <FiltersBar
        filters={filters}
        accounts={accounts}
        categories={categories}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Lançamentos ({transactions.length})
          </h2>
          <p className="text-xs text-ink-muted">
            Receitas pagas no período: {centsToBrl(totalIncome)} · Despesas
            pagas: {centsToBrl(totalExpense)} · Resultado:{" "}
            <span
              className={cn(
                totalIncome - totalExpense >= 0
                  ? "text-emerald-700"
                  : "text-rose-700",
              )}
            >
              {centsToBrl(totalIncome - totalExpense)}
            </span>
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Novo lançamento
        </Button>
      </div>

      {/* Tabela */}
      {transactions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-canvas p-8 text-center text-sm text-ink-muted">
          Nenhum lançamento encontrado{sp.toString() ? " com esses filtros" : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-sm ring-1 ring-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line/70 text-left text-[11px] uppercase tracking-wide text-ink-subtle">
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5">Categoria</th>
                <th className="px-3 py-2.5">Conta</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const account = t.account_id
                  ? accountById.get(t.account_id)
                  : null;
                const category = t.category_id
                  ? categoryById.get(t.category_id)
                  : null;
                const isAutomatic =
                  !!t.source_kind && t.source_kind !== "manual";
                return (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-b border-line/60 transition hover:bg-brand/5",
                      t.status === "cancelled" ? "opacity-50" : "",
                    )}
                  >
                    <td className="px-3 py-2 text-xs text-ink-muted">
                      {new Date(t.occurred_on + "T00:00:00").toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {t.kind === "income" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        <span className="text-ink">
                          {t.description ?? "—"}
                        </span>
                        {isAutomatic ? (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-brand/10 px-1.5 py-0.5 text-[9px] font-medium text-brand"
                            title={`Origem: ${t.source_kind}`}
                          >
                            <Zap className="h-2.5 w-2.5" /> auto
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-muted">
                      {category?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-muted">
                      {account?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={t.status} />
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold",
                        t.kind === "income"
                          ? "text-emerald-700"
                          : "text-rose-700",
                      )}
                    >
                      {t.kind === "expense" ? "-" : "+"}
                      {centsToBrl(t.amount_cents)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {t.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => markPaid(t.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                            title="Marcar como pago"
                            disabled={pending}
                          >
                            <Check className="h-3 w-3" /> pagar
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-brand/10 hover:text-brand"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {!isAutomatic ? (
                          <button
                            type="button"
                            onClick={() => remove(t)}
                            disabled={pending}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-danger/10 hover:text-danger"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <TransactionDialog
          draft={draft}
          setDraft={setDraft}
          accounts={accounts}
          categories={categories}
          paymentMethods={paymentMethods}
          onCancel={close}
          onSave={save}
          pending={pending}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FiltersBar({
  filters,
  accounts,
  categories,
  onApply,
  onClear,
}: {
  filters: Filters;
  accounts: AccountRow[];
  categories: CategoryRow[];
  onApply: (f: Filters) => void;
  onClear: () => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setLocal((p) => ({ ...p, [key]: value }));
  }

  const hasFilter = Object.values(local).some((v) => v && v.length > 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(local);
      }}
      className="grid gap-2 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line lg:grid-cols-[repeat(7,minmax(0,1fr))_auto]"
    >
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase">De</Label>
        <Input
          type="date"
          value={local.from}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase">Até</Label>
        <Input
          type="date"
          value={local.to}
          onChange={(e) => update("to", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase">Tipo</Label>
        <select
          className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
          value={local.kind}
          onChange={(e) => update("kind", e.target.value)}
        >
          <option value="">Tudo</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase">Status</Label>
        <select
          className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
          value={local.status}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase">Conta</Label>
        <select
          className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
          value={local.account}
          onChange={(e) => update("account", e.target.value)}
        >
          <option value="">Todas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase">Categoria</Label>
        <select
          className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
          value={local.category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.kind === "income" ? "rec" : "desp"})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase">Buscar</Label>
        <Input
          placeholder="descrição…"
          value={local.q}
          onChange={(e) => update("q", e.target.value)}
        />
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" size="sm">
          <Search className="h-3.5 w-3.5" /> Filtrar
        </Button>
        {hasFilter ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setLocal({
                from: "",
                to: "",
                kind: "",
                status: "",
                account: "",
                category: "",
                q: "",
              });
              onClear();
            }}
          >
            <X className="h-3.5 w-3.5" /> limpar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const tone =
    status === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : status === "pending"
        ? "bg-amber-100 text-amber-800"
        : "bg-muted text-ink-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        tone,
      )}
    >
      {TRANSACTION_STATUS_LABEL[status]}
    </span>
  );
}

function TransactionDialog({
  draft,
  setDraft,
  accounts,
  categories,
  paymentMethods,
  onCancel,
  onSave,
  pending,
}: {
  draft: Draft;
  setDraft: (d: Draft | ((p: Draft) => Draft)) => void;
  accounts: AccountRow[];
  categories: CategoryRow[];
  paymentMethods: PaymentMethodRow[];
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
}) {
  const filteredCategories = categories.filter(
    (c) => c.kind === draft.kind && !c.is_archived,
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-xl rounded-3xl bg-surface p-6 shadow-lift">
        <h3 className="text-base font-semibold text-ink">
          {draft.id ? "Editar lançamento" : "Novo lançamento"}
        </h3>
        {draft.isAutomatic ? (
          <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
            <Zap className="h-3 w-3" /> Lançamento automático — apenas status,
            data, conta e forma de pagamento podem ser editados.
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Descrição</Label>
            <Input
              value={draft.description}
              onChange={(e) =>
                setDraft((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Ex.: Aluguel, Recebimento Pix Maria…"
              disabled={draft.isAutomatic}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(["income", "expense"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={draft.isAutomatic}
                  onClick={() =>
                    setDraft((p) => ({ ...p, kind: k, categoryId: "" }))
                  }
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition",
                    draft.kind === k
                      ? k === "income"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-line bg-canvas text-ink-muted hover:border-brand/40",
                    draft.isAutomatic ? "opacity-50" : "",
                  )}
                >
                  {k === "income" ? "Receita" : "Despesa"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Valor (R$)</Label>
            <Input
              inputMode="decimal"
              disabled={draft.isAutomatic}
              value={draft.amountStr}
              onChange={(e) =>
                setDraft((p) => ({ ...p, amountStr: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Data</Label>
            <Input
              type="date"
              value={draft.occurredOn}
              onChange={(e) =>
                setDraft((p) => ({ ...p, occurredOn: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
              value={draft.status}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  status: e.target.value as TransactionStatus,
                }))
              }
            >
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          {draft.status === "pending" ? (
            <div className="space-y-1">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={draft.dueDate}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, dueDate: e.target.value }))
                }
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>Conta</Label>
            <select
              className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
              value={draft.accountId}
              onChange={(e) =>
                setDraft((p) => ({ ...p, accountId: e.target.value }))
              }
            >
              <option value="">— Selecione —</option>
              {accounts
                .filter((a) => !a.is_archived)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <select
              className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
              value={draft.paymentMethodId}
              onChange={(e) =>
                setDraft((p) => ({ ...p, paymentMethodId: e.target.value }))
              }
            >
              <option value="">— Selecione —</option>
              {paymentMethods
                .filter((m) => !m.is_archived)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Categoria</Label>
            <select
              className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
              value={draft.categoryId}
              disabled={draft.isAutomatic}
              onChange={(e) =>
                setDraft((p) => ({ ...p, categoryId: e.target.value }))
              }
            >
              <option value="">— Selecione —</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Anotações</Label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm"
              value={draft.notes}
              onChange={(e) =>
                setDraft((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
