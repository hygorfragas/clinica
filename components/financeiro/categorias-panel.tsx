"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFinancialCategory,
  deleteFinancialCategory,
  updateFinancialCategory,
} from "@/lib/financial/actions";
import type { CategoryRow } from "@/lib/financial/queries";
import type { CategoryKind } from "@/lib/financial/schemas";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";

type Draft = {
  id: string | null;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
};

function emptyDraft(kind: CategoryKind = "income"): Draft {
  return { id: null, name: "", kind, parentId: null };
}

export function CategoriasPanel({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [open, setOpen] = useState(false);
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const grouped = useMemo(() => {
    const income: CategoryRow[] = [];
    const expense: CategoryRow[] = [];
    for (const c of categories) {
      if (c.kind === "income") income.push(c);
      else expense.push(c);
    }
    return { income, expense };
  }, [categories]);

  function openCreate(kind: CategoryKind) {
    setDraft(emptyDraft(kind));
    setOpen(true);
  }
  function openEdit(c: CategoryRow) {
    setDraft({
      id: c.id,
      name: c.name,
      kind: c.kind,
      parentId: c.parent_id,
    });
    setOpen(true);
  }
  function close() {
    setOpen(false);
  }

  function save() {
    if (draft.name.trim().length < 2) {
      notifyError(null, "Nome muito curto.");
      return;
    }
    startTransition(async () => {
      const payload = {
        name: draft.name.trim(),
        kind: draft.kind,
        parentId: draft.parentId,
      };
      const result = draft.id
        ? await updateFinancialCategory({ ...payload, id: draft.id })
        : await createFinancialCategory(payload);
      if (!result.ok) {
        notifyError(null, result.error);
        return;
      }
      notifySuccess(draft.id ? "Categoria atualizada." : "Categoria criada.");
      close();
      router.refresh();
    });
  }

  function archive(c: CategoryRow) {
    confirm({
      title: c.is_archived ? "Reativar categoria" : "Arquivar categoria",
      description:
        "Categorias arquivadas somem dos seletores, mas continuam vinculadas aos lançamentos passados.",
      confirmLabel: c.is_archived ? "Reativar" : "Arquivar",
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            const result = c.is_archived
              ? await updateFinancialCategory({
                  id: c.id,
                  name: c.name,
                  kind: c.kind,
                  parentId: c.parent_id,
                  isArchived: false,
                })
              : await deleteFinancialCategory(c.id);
            if (!result.ok) {
              notifyError(null, result.error);
              reject(new Error(result.error));
              return;
            }
            notifySuccess(c.is_archived ? "Reativada." : "Arquivada.");
            router.refresh();
            resolve();
          });
        }),
    });
  }

  return (
    <div className="space-y-4">
      {confirmDialog}

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryColumn
          title="Receitas"
          tone="income"
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
          items={grouped.income}
          onCreate={() => openCreate("income")}
          onEdit={openEdit}
          onArchive={archive}
          pending={pending}
        />
        <CategoryColumn
          title="Despesas"
          tone="expense"
          icon={<ArrowDownRight className="h-3.5 w-3.5" />}
          items={grouped.expense}
          onCreate={() => openCreate("expense")}
          onEdit={openEdit}
          onArchive={archive}
          pending={pending}
        />
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-lift">
            <h3 className="text-base font-semibold text-ink">
              {draft.id ? "Editar categoria" : "Nova categoria"}
            </h3>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex.: Procedimento estético, Aluguel, Marketing…"
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <div className="flex gap-2">
                  {(["income", "expense"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, kind: k }))}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition",
                        draft.kind === k
                          ? k === "income"
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-rose-400 bg-rose-50 text-rose-700"
                          : "border-line bg-canvas text-ink-muted hover:border-brand/40 hover:text-ink",
                      )}
                    >
                      {k === "income" ? "Receita" : "Despesa"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Categoria-pai (opcional)</Label>
                <select
                  className="h-10 w-full rounded-md border border-line bg-canvas px-2 text-sm"
                  value={draft.parentId ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      parentId: e.target.value || null,
                    }))
                  }
                >
                  <option value="">— Sem pai —</option>
                  {categories
                    .filter(
                      (c) =>
                        c.kind === draft.kind &&
                        !c.is_archived &&
                        c.id !== draft.id,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
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

function CategoryColumn({
  title,
  tone,
  icon,
  items,
  onCreate,
  onEdit,
  onArchive,
  pending,
}: {
  title: string;
  tone: "income" | "expense";
  icon: React.ReactNode;
  items: CategoryRow[];
  onCreate: () => void;
  onEdit: (c: CategoryRow) => void;
  onArchive: (c: CategoryRow) => void;
  pending: boolean;
}) {
  const colorChip =
    tone === "income"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-rose-100 text-rose-800";
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, CategoryRow[]>();
    for (const c of items) {
      const list = map.get(c.parent_id) ?? [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    return map;
  }, [items]);

  const roots = childrenByParent.get(null) ?? [];

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full",
              colorChip,
            )}
          >
            {icon}
          </span>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <span className="text-[11px] text-ink-subtle">
            {items.filter((c) => !c.is_archived).length} ativas
          </span>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onCreate}>
          <Plus className="h-3 w-3" /> Nova
        </Button>
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-canvas p-4 text-sm text-ink-muted">
          Nenhuma categoria ainda.
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {roots.map((c) => (
            <CategoryNode
              key={c.id}
              cat={c}
              childrenByParent={childrenByParent}
              onEdit={onEdit}
              onArchive={onArchive}
              pending={pending}
              depth={0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryNode({
  cat,
  childrenByParent,
  onEdit,
  onArchive,
  pending,
  depth,
}: {
  cat: CategoryRow;
  childrenByParent: Map<string | null, CategoryRow[]>;
  onEdit: (c: CategoryRow) => void;
  onArchive: (c: CategoryRow) => void;
  pending: boolean;
  depth: number;
}) {
  const children = childrenByParent.get(cat.id) ?? [];
  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5",
          cat.is_archived
            ? "opacity-50"
            : "hover:bg-brand/5",
        )}
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        <span className="flex-1 truncate text-ink">{cat.name}</span>
        {cat.is_archived ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-ink-muted">
            arquivada
          </span>
        ) : null}
        <button
          type="button"
          className="text-ink-muted hover:text-brand"
          onClick={() => onEdit(cat)}
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="text-ink-muted hover:text-danger"
          onClick={() => onArchive(cat)}
          disabled={pending}
          title={cat.is_archived ? "Reativar" : "Arquivar"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children.length > 0 ? (
        <ul className="space-y-1.5">
          {children.map((c) => (
            <CategoryNode
              key={c.id}
              cat={c}
              childrenByParent={childrenByParent}
              onEdit={onEdit}
              onArchive={onArchive}
              pending={pending}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
