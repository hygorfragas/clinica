"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProcedure,
  listProcedureBom,
  removeProcedureBomItem,
  setProcedureArchived,
  updateProcedure,
  upsertProcedureBomItem,
  type ProcedureBomItemRow,
} from "@/lib/stock/actions";
import { computePriceCents } from "@/lib/stock/schemas";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export type ProcedureRow = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  cost_cents: number;
  profit_margin_percent: number;
  price_cents: number;
  contract_template_id: string | null;
  requires_signed_contract: boolean;
  is_archived: boolean;
};

export type ContractTemplateOption = {
  id: string;
  title: string;
  is_default: boolean;
};

function parseMoneyToCents(v: string): number {
  const clean = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function centsToMoneyStr(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
function parseNumber(v: string): number {
  const n = Number.parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const emptyForm = {
  name: "",
  description: "",
  duration: "",
  cost: "0,00",
  margin: "0",
  price: "0,00",
  contract_template_id: "",
  requires_signed_contract: true,
  lockPriceFromMargin: true,
};

export type ProductOption = {
  id: string;
  name: string;
  unit: string;
  is_archived: boolean;
};

export function ProceduresPanel({
  procedures,
  contractTemplates,
  products,
}: {
  procedures: ProcedureRow[];
  contractTemplates: ContractTemplateOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const computedPrice = useMemo(() => {
    if (!form.lockPriceFromMargin) return parseMoneyToCents(form.price);
    return computePriceCents(parseMoneyToCents(form.cost), parseNumber(form.margin));
  }, [form.cost, form.margin, form.price, form.lockPriceFromMargin]);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Informe o nome.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createProcedure({
        name: form.name.trim(),
        description: form.description.trim() || null,
        duration_minutes: form.duration ? Math.max(1, parseNumber(form.duration)) : null,
        cost_cents: parseMoneyToCents(form.cost),
        profit_margin_percent: parseNumber(form.margin),
        price_cents: computedPrice,
        contract_template_id: form.contract_template_id || null,
        requires_signed_contract: form.requires_signed_contract,
      });
      if (!res.ok) {
        setError(res.error);
        notifyError(null, res.error);
        return;
      }
      setForm(emptyForm);
      setOpen(false);
      notifySuccess("Procedimento criado.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Procedimentos</h2>
          <p className="text-sm text-ink-muted">
            Cada procedimento define custo, margem, preço final e pode exigir
            contrato específico.
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          {open ? "Fechar" : "Novo procedimento"}
        </Button>
      </div>

      {contractTemplates.length === 0 ? (
        <p className="rounded-xl bg-warn/10 px-4 py-3 text-sm text-warn">
          Cadastre pelo menos um template de contrato em Configurações ›
          Contratos antes de exigir contrato em um procedimento.
        </p>
      ) : null}

      {open ? (
        <form
          onSubmit={onCreate}
          className="grid gap-3 rounded-2xl bg-surface p-5 ring-1 ring-line md:grid-cols-4"
        >
          <Field label="Nome" className="md:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Duração (min)">
            <Input
              inputMode="numeric"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </Field>
          <Field label="Custo (R$)">
            <Input
              inputMode="decimal"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </Field>
          <Field label="Margem (%)">
            <Input
              inputMode="decimal"
              value={form.margin}
              onChange={(e) => setForm({ ...form, margin: e.target.value })}
            />
          </Field>
          <Field label={form.lockPriceFromMargin ? "Preço (auto)" : "Preço (R$)"}>
            <Input
              inputMode="decimal"
              value={form.lockPriceFromMargin ? centsToMoneyStr(computedPrice) : form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              readOnly={form.lockPriceFromMargin}
            />
            <label className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={form.lockPriceFromMargin}
                onChange={(e) =>
                  setForm({ ...form, lockPriceFromMargin: e.target.checked })
                }
              />
              Calcular preço a partir de custo × margem
            </label>
          </Field>
          <Field label="Template de contrato" className="md:col-span-2">
            <select
              className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
              value={form.contract_template_id}
              onChange={(e) =>
                setForm({ ...form, contract_template_id: e.target.value })
              }
            >
              <option value="">— Nenhum —</option>
              {contractTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                  {t.is_default ? " · padrão" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exige contrato assinado?">
            <label className="flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.requires_signed_contract}
                onChange={(e) =>
                  setForm({
                    ...form,
                    requires_signed_contract: e.target.checked,
                  })
                }
              />
              Sim, bloquear venda sem contrato.
            </label>
          </Field>
          <Field label="Descrição" className="md:col-span-4">
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          {error ? (
            <p className="md:col-span-4 text-sm text-danger">{error}</p>
          ) : null}
          <div className="md:col-span-4 flex justify-end">
            <Button type="submit" loading={pending} loadingLabel="Salvando...">
              Salvar procedimento
            </Button>
          </div>
        </form>
      ) : null}

      {procedures.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nenhum procedimento cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-line">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-ink-subtle">
              <tr>
                <th className="px-4 py-2">Procedimento</th>
                <th className="px-4 py-2">Custo</th>
                <th className="px-4 py-2">Margem</th>
                <th className="px-4 py-2">Preço</th>
                <th className="px-4 py-2">Contrato</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p) => (
                <ProcedureRowItem
                  key={p.id}
                  row={p}
                  templates={contractTemplates}
                  products={products}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProcedureRowItem({
  row,
  templates,
  products,
}: {
  row: ProcedureRow;
  templates: ContractTemplateOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const [form, setForm] = useState({
    cost: centsToMoneyStr(row.cost_cents),
    margin: row.profit_margin_percent.toString().replace(".", ","),
    price: centsToMoneyStr(row.price_cents),
    contract: row.contract_template_id ?? "",
    requires: row.requires_signed_contract,
  });
  const templateName =
    templates.find((t) => t.id === row.contract_template_id)?.title ?? null;

  async function save() {
    startTransition(async () => {
      const res = await updateProcedure(row.id, {
        cost_cents: parseMoneyToCents(form.cost),
        profit_margin_percent: parseNumber(form.margin),
        price_cents: parseMoneyToCents(form.price),
        contract_template_id: form.contract || null,
        requires_signed_contract: form.requires,
      });
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Procedimento atualizado.");
      setEditing(false);
      router.refresh();
    });
  }

  async function toggleArchive() {
    startTransition(async () => {
      const result = await setProcedureArchived(row.id, !row.is_archived);
      if (!result.ok) {
        notifyError(null, result.error);
        return;
      }
      notifySuccess(
        row.is_archived ? "Procedimento reativado." : "Procedimento arquivado.",
      );
      router.refresh();
    });
  }

  if (editing) {
    return (
      <tr className="border-t border-line bg-muted/30">
        <td colSpan={6} className="px-4 py-3">
          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Custo (R$)">
              <Input
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </Field>
            <Field label="Margem (%)">
              <Input
                value={form.margin}
                onChange={(e) => setForm({ ...form, margin: e.target.value })}
              />
            </Field>
            <Field label="Preço (R$)">
              <Input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            <Field label="Contrato">
              <select
                className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                value={form.contract}
                onChange={(e) =>
                  setForm({ ...form, contract: e.target.value })
                }
              >
                <option value="">—</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Exigir">
              <label className="flex h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requires}
                  onChange={(e) =>
                    setForm({ ...form, requires: e.target.checked })
                  }
                />
                assinatura
              </label>
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={save} loading={pending} loadingLabel="Salvando...">
              Salvar
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  if (bomOpen) {
    return (
      <tr className="border-t border-line bg-muted/30">
        <td colSpan={6} className="px-4 py-3">
          <ProcedureBomEditor
            procedureId={row.id}
            procedureName={row.name}
            products={products}
            onClose={() => setBomOpen(false)}
          />
        </td>
      </tr>
    );
  }

  const margin = Math.round(row.profit_margin_percent);

  return (
    <tr className={`border-t border-line ${row.is_archived ? "opacity-60" : ""}`}>
      <td className="px-4 py-3">
        <div className="font-medium text-ink">{row.name}</div>
        {row.duration_minutes ? (
          <div className="text-xs text-ink-muted">{row.duration_minutes} min</div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-ink">{BRL.format(row.cost_cents / 100)}</td>
      <td className="px-4 py-3 text-ink-muted">{margin}%</td>
      <td className="px-4 py-3 font-medium text-ink">
        {BRL.format(row.price_cents / 100)}
      </td>
      <td className="px-4 py-3 text-xs text-ink-muted">
        {templateName ?? "—"}
        {row.requires_signed_contract ? (
          <span className="ml-1 rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-medium text-warn">
            obrigatório
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Editar
          </Button>
          {!row.is_archived ? (
            <Button size="sm" variant="secondary" onClick={() => setBomOpen(true)}>
              Insumos
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={toggleArchive} disabled={pending}>
            {row.is_archived ? "Reativar" : "Arquivar"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ProcedureBomEditor({
  procedureId,
  procedureName,
  products,
  onClose,
}: {
  procedureId: string;
  procedureName: string;
  products: ProductOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<ProcedureBomItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const activeProducts = products.filter((p) => !p.is_archived);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await listProcedureBom(procedureId);
      if (cancelled) return;
      if (!res.ok) {
        notifyError(null, res.error);
        setLoading(false);
        return;
      }
      setItems(res.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [procedureId]);

  function addItem() {
    if (!productId) {
      notifyError(null, "Selecione um produto.");
      return;
    }
    const qty = parseNumber(quantity);
    if (qty <= 0) {
      notifyError(null, "Quantidade deve ser maior que zero.");
      return;
    }
    startTransition(async () => {
      const res = await upsertProcedureBomItem(procedureId, {
        productId,
        quantity: qty,
      });
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Insumo salvo.");
      setProductId("");
      setQuantity("1");
      const refreshed = await listProcedureBom(procedureId);
      if (refreshed.ok) setItems(refreshed.items);
      router.refresh();
    });
  }

  function removeItem(pid: string) {
    startTransition(async () => {
      const res = await removeProcedureBomItem(procedureId, pid);
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Insumo removido.");
      setItems((prev) => prev.filter((i) => i.product_id !== pid));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-ink">Insumos · {procedureName}</h3>
          <p className="text-xs text-ink-muted">
            Quantidades padrão usadas no botão “Baixar estoque” do agendamento.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={pending}>
          Fechar
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum insumo cadastrado.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-line"
            >
              <div>
                <div className="text-sm font-medium text-ink">
                  {item.product_name}
                </div>
                <div className="text-xs text-ink-muted">
                  {item.quantity} {item.product_unit}
                  {item.product_is_archived ? " · produto excluído" : ""}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeItem(item.product_id)}
                disabled={pending}
                className="text-destructive hover:text-destructive"
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 md:grid-cols-[1fr_120px_auto]">
        <select
          className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          disabled={pending || activeProducts.length === 0}
        >
          <option value="">Selecionar produto</option>
          {activeProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.unit})
            </option>
          ))}
        </select>
        <Input
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qtd"
          disabled={pending}
        />
        <Button onClick={addItem} loading={pending} loadingLabel="Salvando...">
          Adicionar
        </Button>
      </div>
      {activeProducts.length === 0 ? (
        <p className="text-xs text-warn">
          Cadastre produtos ativos na aba Produtos para montar o BOM.
        </p>
      ) : null}
    </div>
  );
}

function Field({
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
