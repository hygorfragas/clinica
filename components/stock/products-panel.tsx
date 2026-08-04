"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adjustProductStock,
  createProduct,
  setProductArchived,
  updateProduct,
} from "@/lib/stock/actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  description?: string | null;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  cost_cents: number;
  price_cents: number;
  is_archived: boolean;
};

const initialForm = {
  name: "",
  sku: "",
  description: "",
  unit: "un",
  stock_quantity: "0",
  low_stock_threshold: "0",
  cost: "0,00",
  price: "0,00",
};

function parseMoneyToCents(v: string): number {
  const clean = v.replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function centsToMoneyStr(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
function parseNumber(v: string): number {
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function ProductsPanel({ products: initialProducts }: { products: ProductRow[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const visibleProducts = useMemo(
    () =>
      showArchived ? products : products.filter((product) => !product.is_archived),
    [products, showArchived],
  );
  const archivedCount = useMemo(
    () => products.filter((product) => product.is_archived).length,
    [products],
  );

  function patchProduct(id: string, patch: Partial<ProductRow>) {
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? { ...product, ...patch } : product)),
    );
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      const msg = "Informe o nome do produto.";
      setError(msg);
      notifyError(null, msg);
      return;
    }
    setError(null);
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        unit: form.unit.trim() || "un",
        stock_quantity: parseNumber(form.stock_quantity),
        low_stock_threshold: parseNumber(form.low_stock_threshold),
        cost_cents: parseMoneyToCents(form.cost),
        price_cents: parseMoneyToCents(form.price),
      };
      const res = await createProduct(payload);
      if (!res.ok) {
        setError(res.error);
        notifyError(null, res.error);
        return;
      }
      setProducts((prev) =>
        [
          {
            id: res.id,
            name: payload.name,
            sku: payload.sku,
            description: payload.description,
            unit: payload.unit,
            stock_quantity: payload.stock_quantity,
            low_stock_threshold: payload.low_stock_threshold,
            cost_cents: payload.cost_cents,
            price_cents: payload.price_cents,
            is_archived: false,
          },
          ...prev,
        ].sort((a, b) => {
          if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;
          return a.name.localeCompare(b.name, "pt-BR");
        }),
      );
      notifySuccess("Produto cadastrado.");
      setForm(initialForm);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Produtos</h2>
          <p className="text-sm text-ink-muted">
            Insumos, retail e qualquer SKU com controle de quantidade.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {archivedCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived
                ? "Ocultar excluídos"
                : `Ver excluídos (${archivedCount})`}
            </Button>
          ) : null}
          <Button type="button" onClick={() => setOpen((v) => !v)}>
            {open ? "Fechar" : "Novo produto"}
          </Button>
        </div>
      </div>

      {open ? (
        <form
          onSubmit={onCreate}
          className="grid gap-3 rounded-2xl bg-surface p-5 ring-1 ring-line md:grid-cols-4"
        >
          <FormField label="Nome" className="md:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="SKU">
            <Input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </FormField>
          <FormField label="Unidade">
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </FormField>
          <FormField label="Estoque atual">
            <Input
              inputMode="decimal"
              value={form.stock_quantity}
              onChange={(e) =>
                setForm({ ...form, stock_quantity: e.target.value })
              }
            />
          </FormField>
          <FormField label="Alerta (mín.)">
            <Input
              inputMode="decimal"
              value={form.low_stock_threshold}
              onChange={(e) =>
                setForm({ ...form, low_stock_threshold: e.target.value })
              }
            />
          </FormField>
          <FormField label="Custo (R$)">
            <Input
              inputMode="decimal"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </FormField>
          <FormField label="Preço (R$)">
            <Input
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </FormField>
          <FormField label="Descrição" className="md:col-span-4">
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </FormField>
          {error ? (
            <p className="md:col-span-4 text-sm text-danger">{error}</p>
          ) : null}
          <div className="md:col-span-4 flex justify-end">
            <Button type="submit" loading={pending} loadingLabel="Salvando...">
              Salvar produto
            </Button>
          </div>
        </form>
      ) : null}

      {visibleProducts.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {products.length === 0
            ? "Nenhum produto cadastrado."
            : "Nenhum produto ativo. Use “Ver excluídos” para restaurar."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-line">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-ink-subtle">
              <tr>
                <th className="px-4 py-2">Produto</th>
                <th className="px-4 py-2">Estoque</th>
                <th className="px-4 py-2">Custo</th>
                <th className="px-4 py-2">Preço</th>
                <th className="px-4 py-2">Lucro</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p) => (
                <ProductRowItem
                  key={p.id}
                  product={p}
                  onPatched={patchProduct}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductRowItem({
  product,
  onPatched,
}: {
  product: ProductRow;
  onPatched: (id: string, patch: Partial<ProductRow>) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [adjust, setAdjust] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku ?? "",
    description: product.description ?? "",
    unit: product.unit,
    low_stock_threshold: String(product.low_stock_threshold),
    cost: centsToMoneyStr(product.cost_cents),
    price: centsToMoneyStr(product.price_cents),
  });

  useEffect(() => {
    if (editing) return;
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      description: product.description ?? "",
      unit: product.unit,
      low_stock_threshold: String(product.low_stock_threshold),
      cost: centsToMoneyStr(product.cost_cents),
      price: centsToMoneyStr(product.price_cents),
    });
  }, [product, editing]);

  const margin =
    product.cost_cents > 0
      ? ((product.price_cents - product.cost_cents) / product.cost_cents) * 100
      : 0;
  const low = product.stock_quantity <= product.low_stock_threshold;

  function doAdjust() {
    const delta = Number.parseFloat(adjust.replace(",", "."));
    if (!Number.isFinite(delta) || delta === 0) {
      const msg = "Informe ±n";
      setError(msg);
      notifyError(null, msg);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await adjustProductStock(product.id, delta);
      if (!res.ok) {
        setError(res.error);
        notifyError(null, res.error);
        return;
      }
      onPatched(product.id, {
        stock_quantity: Number((product.stock_quantity + delta).toFixed(3)),
      });
      notifySuccess("Estoque ajustado.");
      setAdjust("");
      router.refresh();
    });
  }

  function saveEdit() {
    const name = form.name.trim();
    if (name.length < 2) {
      notifyError(null, "Informe o nome do produto (mín. 2 caracteres).");
      return;
    }
    const next = {
      name,
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      unit: form.unit.trim() || "un",
      low_stock_threshold: parseNumber(form.low_stock_threshold),
      cost_cents: parseMoneyToCents(form.cost),
      price_cents: parseMoneyToCents(form.price),
    };
    startTransition(async () => {
      const res = await updateProduct(product.id, next);
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
      onPatched(product.id, next);
      notifySuccess("Produto atualizado.");
      setEditing(false);
      router.refresh();
    });
  }

  async function confirmDelete() {
    const res = await setProductArchived(product.id, true);
    if (!res.ok) {
      notifyError(null, res.error);
      throw new Error(res.error);
    }
    onPatched(product.id, { is_archived: true });
    notifySuccess("Produto excluído.");
    router.refresh();
  }

  function restore() {
    startTransition(async () => {
      const res = await setProductArchived(product.id, false);
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
      onPatched(product.id, { is_archived: false });
      notifySuccess("Produto restaurado.");
      router.refresh();
    });
  }

  if (editing) {
    return (
      <tr className="border-t border-line bg-muted/30">
        <td colSpan={6} className="px-4 py-3">
          <div className="grid gap-3 md:grid-cols-4">
            <FormField label="Nome" className="md:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </FormField>
            <FormField label="SKU">
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </FormField>
            <FormField label="Unidade">
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </FormField>
            <FormField label="Alerta (mín.)">
              <Input
                inputMode="decimal"
                value={form.low_stock_threshold}
                onChange={(e) =>
                  setForm({ ...form, low_stock_threshold: e.target.value })
                }
              />
            </FormField>
            <FormField label="Custo (R$)">
              <Input
                inputMode="decimal"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </FormField>
            <FormField label="Preço (R$)">
              <Input
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </FormField>
            <FormField label="Descrição" className="md:col-span-4">
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </FormField>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Estoque atual ({product.stock_quantity} {product.unit}) só muda por
            ajuste ou baixa no atendimento.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveEdit}
              loading={pending}
              loadingLabel="Salvando..."
            >
              Salvar
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr
        className={`border-t border-line ${product.is_archived ? "opacity-60" : ""}`}
      >
        <td className="px-4 py-3">
          <div className="font-medium text-ink">{product.name}</div>
          <div className="text-xs text-ink-muted">
            {product.sku ? `SKU ${product.sku} · ` : ""}
            {product.unit}
            {product.is_archived ? " · excluído" : ""}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={low ? "font-semibold text-danger" : "text-ink"}>
            {product.stock_quantity}
          </span>
          <div className="text-xs text-ink-subtle">
            mín {product.low_stock_threshold}
          </div>
        </td>
        <td className="px-4 py-3 text-ink">
          {BRL.format(product.cost_cents / 100)}
        </td>
        <td className="px-4 py-3 text-ink">
          {BRL.format(product.price_cents / 100)}
        </td>
        <td className="px-4 py-3 text-ink-muted">{margin.toFixed(0)}%</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!product.is_archived ? (
              <>
                <Input
                  className="h-8 w-20 text-sm"
                  placeholder="±n"
                  value={adjust}
                  onChange={(e) => setAdjust(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={doAdjust}
                  loading={pending}
                >
                  Ajustar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing(true)}
                  disabled={pending}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Excluir
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={restore}
                loading={pending}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden />
                Restaurar
              </Button>
            )}
          </div>
          {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
        </td>
      </tr>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Excluir produto"
        description="O produto some do catálogo e do BOM, mas o histórico de estoque é preservado. Você pode restaurar em “Ver excluídos”."
        confirmLabel="Excluir"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
