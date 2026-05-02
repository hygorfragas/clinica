"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFinancialAccount,
  deleteFinancialAccount,
  updateFinancialAccount,
} from "@/lib/financial/actions";
import type { AccountWithBalance } from "@/lib/financial/queries";
import {
  ACCOUNT_KIND_LABEL,
  ACCOUNT_KINDS,
  centsToBrl,
  parseBrlToCents,
  type AccountKind,
} from "@/lib/financial/schemas";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";

type Draft = {
  id: string | null;
  name: string;
  kind: AccountKind;
  openingBalanceStr: string;
  notes: string;
  isArchived: boolean;
};

function emptyDraft(): Draft {
  return {
    id: null,
    name: "",
    kind: "cash",
    openingBalanceStr: "0,00",
    notes: "",
    isArchived: false,
  };
}

export function ContasPanel({ accounts }: { accounts: AccountWithBalance[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [open, setOpen] = useState(false);
  const { confirm, element: confirmDialog } = useConfirmDialog();

  function openCreate() {
    setDraft(emptyDraft());
    setOpen(true);
  }
  function openEdit(a: AccountWithBalance) {
    setDraft({
      id: a.id,
      name: a.name,
      kind: a.kind,
      openingBalanceStr: (a.opening_balance_cents / 100)
        .toFixed(2)
        .replace(".", ","),
      notes: a.notes ?? "",
      isArchived: a.is_archived,
    });
    setOpen(true);
  }
  function close() {
    setOpen(false);
  }

  function save() {
    if (draft.name.trim().length < 2) {
      notifyError(null, "Dê um nome para a conta.");
      return;
    }
    startTransition(async () => {
      const payload = {
        name: draft.name.trim(),
        kind: draft.kind,
        openingBalanceCents: parseBrlToCents(draft.openingBalanceStr),
        notes: draft.notes.trim() || null,
      };
      const result = draft.id
        ? await updateFinancialAccount({
            ...payload,
            id: draft.id,
            isArchived: draft.isArchived,
          })
        : await createFinancialAccount(payload);
      if (!result.ok) {
        notifyError(null, result.error);
        return;
      }
      notifySuccess(draft.id ? "Conta atualizada." : "Conta criada.");
      close();
      router.refresh();
    });
  }

  function toggleArchive(a: AccountWithBalance) {
    startTransition(async () => {
      const result = await updateFinancialAccount({
        id: a.id,
        name: a.name,
        kind: a.kind,
        openingBalanceCents: a.opening_balance_cents,
        notes: a.notes,
        isArchived: !a.is_archived,
      });
      if (!result.ok) {
        notifyError(null, result.error);
        return;
      }
      notifySuccess(a.is_archived ? "Conta reativada." : "Conta arquivada.");
      router.refresh();
    });
  }

  function remove(a: AccountWithBalance) {
    confirm({
      title: "Excluir conta",
      description:
        "Se houver lançamentos vinculados, a conta será apenas arquivada (histórico preservado).",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            const result = await deleteFinancialAccount(a.id);
            if (!result.ok) {
              notifyError(null, result.error);
              reject(new Error(result.error));
              return;
            }
            notifySuccess("Conta removida.");
            router.refresh();
            resolve();
          });
        }),
    });
  }

  return (
    <div className="space-y-4">
      {confirmDialog}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
        <div>
          <h2 className="text-sm font-semibold text-ink">Contas financeiras</h2>
          <p className="text-xs text-ink-muted">
            Caixa, banco, carteira digital. O saldo é calculado a partir das
            transações pagas + saldo inicial.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Nova conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-canvas p-6 text-sm text-ink-muted">
          Nenhuma conta criada ainda.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-2xl bg-surface p-4 shadow-sm ring-1",
                a.is_archived
                  ? "opacity-60 ring-line/60"
                  : "ring-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
                    {ACCOUNT_KIND_LABEL[a.kind]}
                  </p>
                  <p className="truncate text-sm font-semibold text-ink">
                    {a.name}
                    {a.is_archived ? (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-ink-muted">
                        arquivada
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <p
                className={cn(
                  "mt-3 text-2xl font-semibold",
                  a.balance_cents >= 0 ? "text-ink" : "text-danger",
                )}
              >
                {centsToBrl(a.balance_cents)}
              </p>
              <p className="text-[11px] text-ink-subtle">
                Saldo inicial: {centsToBrl(a.opening_balance_cents)}
              </p>
              {a.notes ? (
                <p className="mt-2 line-clamp-2 text-xs text-ink-muted">
                  {a.notes}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(a)}
                >
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleArchive(a)}
                  disabled={pending}
                >
                  {a.is_archived ? (
                    <>
                      <ArchiveRestore className="h-3 w-3" /> Reativar
                    </>
                  ) : (
                    <>
                      <Archive className="h-3 w-3" /> Arquivar
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => remove(a)}
                  disabled={pending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-lift">
            <h3 className="text-base font-semibold text-ink">
              {draft.id ? "Editar conta" : "Nova conta"}
            </h3>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex.: Caixa principal, Banco Inter…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <select
                    className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
                    value={draft.kind}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        kind: e.target.value as AccountKind,
                      }))
                    }
                  >
                    {ACCOUNT_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {ACCOUNT_KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Saldo inicial (R$)</Label>
                  <Input
                    inputMode="decimal"
                    value={draft.openingBalanceStr}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        openingBalanceStr: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Anotações (opcional)</Label>
                <textarea
                  className="min-h-[70px] w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm"
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={close}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={pending}>
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
