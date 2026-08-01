"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

export function ProductsPanel({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      const res = await createProduct({
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        unit: form.unit.trim() || "un",
        stock_quantity: parseNumber(form.stock_quantity),
        low_stock_threshold: parseNumber(form.low_stock_threshold),
        cost_cents: parseMoneyToCents(form.cost),
        price_cents: parseMoneyToCents(form.price),
      });
      if (!res.ok) {
        setError(res.error);
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Produto cadastrado.");
      setForm(initialForm);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Produtos</h2>
          <p className="text-sm text-ink-muted">
            Insumos, retail e qualquer SKU com controle de quantidade.
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          {open ? "Fechar" : "Novo produto"}
        </Button>
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

      {products.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum produto cadastrado.</p>
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
              {products.map((p) => (
                <ProductRowItem key={p.id} product={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductRowItem({ product }: { product: ProductRow }) {
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
      notifySuccess("Estoque ajustado.");
      setAdjust("");
      router.refresh();
    });
  }

  function saveEdit() {
    if (!form.name.trim()) {
      notifyError(null, "Informe o nome do produto.");
      return;
    }
    startTransition(async () => {
      const res = await updateProduct(product.id, {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        unit: form.unit.trim() || "un",
        low_stock_threshold: parseNumber(form.low_stock_threshold),
        cost_cents: parseMoneyToCents(form.cost),
        price_cents: parseMoneyToCents(form.price),
      });
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
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
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
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
                  size="sm"
                  variant="secondary"
                  onClick={doAdjust}
                  loading={pending}
                >
                  Ajustar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing(true)}
                  disabled={pending}
                >
                  Editar
                </Button>
                <Button
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
        description="O produto sai do catálogo e do BOM, mas o histórico de estoque é preservado. Você pode restaurar depois."
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
