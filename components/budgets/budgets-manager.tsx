"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Pencil, Plus, Share2, Trash2, X } from "lucide-react";
import { PatientSearchDialog } from "@/components/clients/patient-search-dialog";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import {
  changeBudgetStatus,
  convertBudgetToPurchase,
  createBudget,
  deleteBudget,
  generateBudgetPdf,
  updateBudget,
} from "@/lib/budgets/actions";

type ClientOption = { id: string; full_name: string; cpf: string | null };
type ProcedureOption = { id: string; name: string; price_cents: number };
type ProductOption = { id: string; name: string; price_cents: number };
type BrandingProfileOption = { id: string; name: string; is_default: boolean };
type BudgetItemView = {
  id: string;
  procedure_id?: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number | null;
};
type BudgetView = {
  id: string;
  title: string | null;
  status: string;
  subtotal_cents: number | null;
  discount_cents: number;
  total_cents: number | null;
  valid_until: string | null;
  created_at: string;
  client_id: string;
  client_name: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  items: BudgetItemView[];
};

type DraftItem = {
  localId: string;
  procedureId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function statusClasses(status: string): string {
  if (status === "approved") return "bg-brand/12 text-brand ring-brand/25";
  if (status === "sent") return "bg-warn/10 text-warn ring-warn/25";
  if (status === "cancelled") return "bg-danger/10 text-danger ring-danger/20";
  return "bg-muted text-ink-muted ring-line";
}

function statusLabel(status: string): string {
  if (status === "approved") return "Aprovado";
  if (status === "sent") return "Enviado";
  if (status === "cancelled") return "Cancelado";
  return "Rascunho";
}

function moneyToCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function canEditBudget(status: string): boolean {
  return status === "draft" || status === "sent";
}

function budgetToDraftItems(budget: BudgetView): DraftItem[] {
  if (budget.items.length === 0) return [makeItem()];
  return budget.items.map((item) => ({
    localId: item.id,
    procedureId: item.procedure_id ?? null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: centsToInput(item.unit_price_cents),
  }));
}

function makeItem(localId?: string): DraftItem {
  return {
    localId: localId ?? crypto.randomUUID(),
    procedureId: null,
    description: "",
    quantity: 1,
    unitPrice: "0,00",
  };
}

export function BudgetsManager({
  clients,
  procedures,
  products,
  budgets,
  brandingProfiles = [],
}: {
  clients: ClientOption[];
  procedures: ProcedureOption[];
  products: ProductOption[];
  budgets: BudgetView[];
  brandingProfiles?: BrandingProfileOption[];
}) {
  const router = useRouter();
  const { confirm, element: confirmDialog } = useConfirmDialog();
  const draftNs = useId().replace(/:/g, "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState("0,00");
  /** `useId` evita mismatch de hidratação (Safari/iPad) com `crypto.randomUUID` no primeiro render. */
  const [items, setItems] = useState<DraftItem[]>(() => [makeItem(`${draftNs}-0`)]);
  const defaultBrandingId =
    brandingProfiles.find((profile) => profile.is_default)?.id ?? "";
  const [selectedBrandingByBudget, setSelectedBrandingByBudget] = useState<
    Record<string, string>
  >({});
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editDiscount, setEditDiscount] = useState("0,00");
  const [editItems, setEditItems] = useState<DraftItem[]>([]);

  function updateItem(localId: string, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, makeItem()]);
  }

  function removeItem(localId: string) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.localId !== localId)));
  }

  function applyProcedure(localId: string, procedureId: string) {
    const proc = procedures.find((p) => p.id === procedureId);
    if (!proc) {
      updateItem(localId, { procedureId: null });
      return;
    }
    updateItem(localId, {
      procedureId: proc.id,
      description: proc.name,
      unitPrice: centsToInput(proc.price_cents),
    });
  }

  function applyProduct(localId: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    updateItem(localId, {
      procedureId: null,
      description: product.name,
      unitPrice: centsToInput(product.price_cents),
    });
  }

  function subtotalCents(): number {
    return items.reduce(
      (sum, item) => sum + item.quantity * moneyToCents(item.unitPrice),
      0,
    );
  }

  function editSubtotalCents(): number {
    return editItems.reduce(
      (sum, item) => sum + item.quantity * moneyToCents(item.unitPrice),
      0,
    );
  }

  function updateEditItem(localId: string, patch: Partial<DraftItem>) {
    setEditItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  }

  function addEditItem() {
    setEditItems((prev) => [...prev, makeItem()]);
  }

  function removeEditItem(localId: string) {
    setEditItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((x) => x.localId !== localId),
    );
  }

  function applyEditProcedure(localId: string, procedureId: string) {
    const proc = procedures.find((p) => p.id === procedureId);
    if (!proc) {
      updateEditItem(localId, { procedureId: null });
      return;
    }
    updateEditItem(localId, {
      procedureId: proc.id,
      description: proc.name,
      unitPrice: centsToInput(proc.price_cents),
    });
  }

  function applyEditProduct(localId: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    updateEditItem(localId, {
      procedureId: null,
      description: product.name,
      unitPrice: centsToInput(product.price_cents),
    });
  }

  function startEdit(budget: BudgetView) {
    setEditingBudgetId(budget.id);
    setEditTitle(budget.title?.trim() ?? "");
    setEditValidUntil(budget.valid_until ?? "");
    setEditDiscount(centsToInput(budget.discount_cents ?? 0));
    setEditItems(budgetToDraftItems(budget));
    setError(null);
  }

  function cancelEdit() {
    setEditingBudgetId(null);
    setEditTitle("");
    setEditValidUntil("");
    setEditDiscount("0,00");
    setEditItems([]);
    setError(null);
  }

  function saveEdit(budgetId: string) {
    setError(null);
    const payloadItems = editItems
      .map((item) => ({
        procedureId: item.procedureId,
        description: item.description.trim(),
        quantity: item.quantity,
        unitPriceCents: moneyToCents(item.unitPrice),
      }))
      .filter((item) => item.description.length > 0);

    if (payloadItems.length === 0) {
      const msg = "Adicione pelo menos um item com descrição.";
      setError(msg);
      notifyError(null, msg);
      return;
    }

    startTransition(async () => {
      const result = await updateBudget({
        budgetId,
        title: editTitle.trim() || null,
        validUntil: editValidUntil || null,
        discountCents: moneyToCents(editDiscount),
        items: payloadItems,
      });
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      cancelEdit();
      notifySuccess("Orçamento atualizado.");
      router.refresh();
    });
  }

  function whatsappText(budget: BudgetView): string {
    const lines = budget.items
      .map((item) => {
        const lineTotal =
          item.line_total_cents ?? item.quantity * item.unit_price_cents;
        return `- ${item.quantity}x ${item.description}: ${BRL.format(lineTotal / 100)}`;
      })
      .join("\n");
    const valid =
      budget.valid_until
        ? `\nValidade: ${new Date(budget.valid_until).toLocaleDateString("pt-BR")}`
        : "";
    return `Olá! Segue seu orçamento ${
      budget.title?.trim() || ""
    }\nPaciente: ${budget.client_name}\n\n${lines}\n\nTotal: ${BRL.format((budget.total_cents ?? 0) / 100)}${valid}\n\nSe desejar, responda esta mensagem para confirmar.`;
  }

  function submitBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!clientId) {
      const msg = "Selecione a paciente do orçamento.";
      setError(msg);
      notifyError(null, msg);
      return;
    }

    const payloadItems = items
      .map((item) => ({
        procedureId: item.procedureId,
        description: item.description.trim(),
        quantity: item.quantity,
        unitPriceCents: moneyToCents(item.unitPrice),
      }))
      .filter((item) => item.description.length > 0);

    if (payloadItems.length === 0) {
      const msg = "Adicione pelo menos um item com descrição.";
      setError(msg);
      notifyError(null, msg);
      return;
    }

    const discountCents = moneyToCents(discount);

    startTransition(async () => {
      const result = await createBudget({
        clientId,
        title: title.trim() || null,
        validUntil: validUntil || null,
        discountCents,
        items: payloadItems,
      });
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      setTitle("");
      setValidUntil("");
      setDiscount("0,00");
      setItems([makeItem()]);
      notifySuccess("Orçamento criado.");
      router.refresh();
    });
  }

  function setStatus(budgetId: string, status: "draft" | "sent" | "approved" | "cancelled") {
    setError(null);
    startTransition(async () => {
      const result = await changeBudgetStatus(budgetId, status);
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      notifySuccess("Status do orçamento atualizado.");
      router.refresh();
    });
  }

  function launchFinancial(budgetId: string) {
    setError(null);
    startTransition(async () => {
      const result = await convertBudgetToPurchase(budgetId);
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      notifySuccess("Orçamento enviado para financeiro.");
      router.refresh();
    });
  }

  function removeBudget(budgetId: string) {
    confirm({
      title: "Excluir orçamento",
      description:
        "O orçamento será apagado e a entrada pendente no Financeiro (se houver) será estornada. Não pode ser desfeito.",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            const result = await deleteBudget(budgetId);
            if (!result.ok) {
              setError(result.error);
              notifyError(null, result.error);
              reject(new Error(result.error));
              return;
            }
            notifySuccess("Orçamento excluído.");
            router.refresh();
            resolve();
          });
        }),
    });
  }

  function exportPdf(budgetId: string) {
    setError(null);
    const selected = selectedBrandingByBudget[budgetId] ?? defaultBrandingId;
    const brandingProfileId = selected ? selected : null;
    startTransition(async () => {
      const result = await generateBudgetPdf({ budgetId, brandingProfileId });
      if (!result.ok) {
        setError(result.error);
        notifyError(null, result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {confirmDialog}
      <form
        onSubmit={submitBudget}
        className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Novo orçamento</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Monte itens com preços do catálogo e adicione linhas personalizadas
              quando necessário.
            </p>
          </div>
          <Button type="submit" loading={pending} loadingLabel="Salvando...">
            Gerar orçamento
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <PatientSearchDialog
              patients={clients}
              selectedPatientId={clientId}
              onSelect={setClientId}
              buttonLabel="Buscar paciente"
            />
          </div>
          <div className="space-y-2">
            <Label>Título do orçamento (opcional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Protocolo facial premium"
            />
          </div>
          <div className="space-y-2">
            <Label>Validade (opcional)</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {items.map((item, index) => (
            <div
              key={item.localId}
              className="grid gap-3 rounded-2xl border border-line/70 bg-muted/20 p-4 md:grid-cols-12"
            >
              <div className="space-y-2 md:col-span-4">
                <Label>Procedimento (catálogo)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                  value={item.procedureId ?? ""}
                  onChange={(e) => applyProcedure(item.localId, e.target.value)}
                >
                  <option value="">Item livre</option>
                  {procedures.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      {proc.name} · {BRL.format(proc.price_cents / 100)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label>Produto (estoque)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) applyProduct(item.localId, e.target.value);
                  }}
                >
                  <option value="">Selecionar produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {BRL.format(product.price_cents / 100)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label>Descrição</Label>
                <Input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.localId, { description: e.target.value })
                  }
                  placeholder={`Item ${index + 1}`}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Qtd</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.localId, {
                      quantity: Number.parseInt(e.target.value || "1", 10),
                    })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Unitário (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(item.localId, { unitPrice: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-12 flex justify-between">
                <p className="text-sm text-ink-muted">
                  Total do item:{" "}
                  <strong className="font-semibold text-ink">
                    {BRL.format((item.quantity * moneyToCents(item.unitPrice)) / 100)}
                  </strong>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => removeItem(item.localId)}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" className="gap-2" onClick={addItem}>
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar item
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/30 p-4 ring-1 ring-line/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Subtotal
            </p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {BRL.format(subtotalCents() / 100)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/30 p-4 ring-1 ring-line/70">
            <Label>Desconto (R$)</Label>
            <Input
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <div className="rounded-2xl bg-brand/8 p-4 ring-1 ring-brand/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Total final
            </p>
            <p className="mt-1 text-xl font-semibold text-brand">
              {BRL.format(
                Math.max(0, subtotalCents() - moneyToCents(discount)) / 100,
              )}
            </p>
          </div>
        </div>
        {error ? (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Orçamentos gerados</h2>
        {budgets.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-muted/20 p-8 text-sm text-ink-muted">
            Nenhum orçamento ainda. Crie o primeiro no formulário acima.
          </p>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const isEditing = editingBudgetId === budget.id;
              return (
              <article
                key={budget.id}
                className="rounded-[1.5rem] bg-surface p-5 shadow-lift ring-1 ring-line"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Título do orçamento</Label>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Ex.: Protocolo facial premium"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Validade</Label>
                          <Input
                            type="date"
                            value={editValidUntil}
                            onChange={(e) => setEditValidUntil(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-semibold text-ink">
                          {budget.title?.trim() || "Orçamento sem título"}
                        </h3>
                        <p className="mt-1 text-sm text-ink-muted">
                          {budget.client_name} · criado em{" "}
                          {new Date(budget.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses(
                        budget.status,
                      )}`}
                      title={
                        budget.status === "cancelled" &&
                        budget.cancellation_reason === "auto_expired"
                          ? `Cancelado automaticamente por vencimento${
                              budget.valid_until
                                ? ` (${new Date(budget.valid_until).toLocaleDateString("pt-BR")})`
                                : ""
                            }`
                          : undefined
                      }
                    >
                      {statusLabel(budget.status)}
                      {budget.status === "cancelled" &&
                      budget.cancellation_reason === "auto_expired"
                        ? " · vencido"
                        : ""}
                    </span>
                    {!isEditing ? (
                      <select
                        className="h-8 rounded-md border border-line bg-[#f3f1ee] px-2 text-xs"
                        value={budget.status}
                        onChange={(e) =>
                          setStatus(
                            budget.id,
                            e.target.value as "draft" | "sent" | "approved" | "cancelled",
                          )
                        }
                      >
                        <option value="draft">Rascunho</option>
                        <option value="sent">Enviado</option>
                        <option value="approved">Aprovado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-3">
                    {editItems.map((item, index) => (
                      <div
                        key={item.localId}
                        className="grid gap-3 rounded-2xl border border-line/70 bg-muted/20 p-4 md:grid-cols-12"
                      >
                        <div className="space-y-2 md:col-span-4">
                          <Label>Procedimento (catálogo)</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                            value={item.procedureId ?? ""}
                            onChange={(e) =>
                              applyEditProcedure(item.localId, e.target.value)
                            }
                          >
                            <option value="">Item livre</option>
                            {procedures.map((proc) => (
                              <option key={proc.id} value={proc.id}>
                                {proc.name} · {BRL.format(proc.price_cents / 100)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2 md:col-span-4">
                          <Label>Produto (estoque)</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) applyEditProduct(item.localId, e.target.value);
                            }}
                          >
                            <option value="">Selecionar produto</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} · {BRL.format(product.price_cents / 100)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2 md:col-span-4">
                          <Label>Descrição</Label>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateEditItem(item.localId, { description: e.target.value })
                            }
                            placeholder={`Item ${index + 1}`}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Qtd</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={item.quantity}
                            onChange={(e) =>
                              updateEditItem(item.localId, {
                                quantity: Number.parseInt(e.target.value || "1", 10),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Unitário (R$)</Label>
                          <Input
                            inputMode="decimal"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateEditItem(item.localId, { unitPrice: e.target.value })
                            }
                          />
                        </div>
                        <div className="md:col-span-12 flex justify-between">
                          <p className="text-sm text-ink-muted">
                            Total do item:{" "}
                            <strong className="font-semibold text-ink">
                              {BRL.format(
                                (item.quantity * moneyToCents(item.unitPrice)) / 100,
                              )}
                            </strong>
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-danger"
                            onClick={() => removeEditItem(item.localId)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={addEditItem}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Adicionar item
                    </Button>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-muted/30 p-4 ring-1 ring-line/70">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                          Subtotal
                        </p>
                        <p className="mt-1 text-xl font-semibold text-ink">
                          {BRL.format(editSubtotalCents() / 100)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 p-4 ring-1 ring-line/70">
                        <Label>Desconto (R$)</Label>
                        <Input
                          inputMode="decimal"
                          value={editDiscount}
                          onChange={(e) => setEditDiscount(e.target.value)}
                        />
                      </div>
                      <div className="rounded-2xl bg-brand/8 p-4 ring-1 ring-brand/20">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                          Total final
                        </p>
                        <p className="mt-1 text-xl font-semibold text-brand">
                          {BRL.format(
                            Math.max(0, editSubtotalCents() - moneyToCents(editDiscount)) /
                              100,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <ul className="mt-4 space-y-1 text-sm text-ink-muted">
                      {budget.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity}x {item.description} ·{" "}
                          {BRL.format(
                            (item.line_total_cents ??
                              item.quantity * item.unit_price_cents) / 100,
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                      <p>
                        Subtotal:{" "}
                        <strong className="font-semibold text-ink">
                          {BRL.format((budget.subtotal_cents ?? 0) / 100)}
                        </strong>
                      </p>
                      <p>
                        Desconto:{" "}
                        <strong className="font-semibold text-ink">
                          {BRL.format((budget.discount_cents ?? 0) / 100)}
                        </strong>
                      </p>
                      <p>
                        Total:{" "}
                        <strong className="font-semibold text-brand">
                          {BRL.format((budget.total_cents ?? 0) / 100)}
                        </strong>
                      </p>
                    </div>
                  </>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        loading={pending}
                        loadingLabel="Salvando..."
                        onClick={() => saveEdit(budget.id)}
                      >
                        Salvar alterações
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        disabled={pending}
                        onClick={cancelEdit}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                  {canEditBudget(budget.status) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      disabled={pending || editingBudgetId !== null}
                      onClick={() => startEdit(budget)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Editar
                    </Button>
                  ) : null}
                  {brandingProfiles.length > 0 ? (
                    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      Layout:
                      <select
                        className="h-8 rounded-md border border-line bg-[#f3f1ee] px-2 text-xs"
                        value={
                          selectedBrandingByBudget[budget.id] ?? defaultBrandingId
                        }
                        onChange={(e) =>
                          setSelectedBrandingByBudget((prev) => ({
                            ...prev,
                            [budget.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Sem branding</option>
                        {brandingProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                            {profile.is_default ? " (padrão)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    disabled={pending}
                    onClick={() => exportPdf(budget.id)}
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden />
                    Exportar PDF
                  </Button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(whatsappText(budget))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand/12 px-3 text-xs font-semibold text-brand ring-1 ring-brand/25 hover:bg-brand/18"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    Compartilhar WhatsApp
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => launchFinancial(budget.id)}
                  >
                    Lançar no financeiro
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    disabled={pending}
                    onClick={() => removeBudget(budget.id)}
                    title="Excluir orçamento"
                    aria-label="Excluir orçamento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                    </>
                  )}
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
