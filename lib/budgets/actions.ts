"use server";

import { revalidatePath } from "next/cache";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import {
  computeContentBox,
  drawBrandingOnPage,
  resolveBrandingForPdf,
} from "@/lib/branding/apply-to-pdf";
import { buildClinicalStoragePath, CLINICAL_BUCKET } from "@/lib/clinical/storage";
import {
  requireClinicalTenantContext,
  type ClinicSupabaseClient,
} from "@/lib/clients/clinical-tenant-context";
import {
  dispatchBudgetApproved,
  dispatchBudgetCancelled,
  dispatchSaleCreated,
} from "@/lib/financial/dispatcher";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

const itemSchema = z.object({
  procedureId: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(2).max(200),
  quantity: z.number().int().min(1).max(30),
  unitPriceCents: z.number().int().min(0),
});

const createBudgetSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().trim().max(200).nullable().optional(),
  validUntil: z.string().date().nullable().optional(),
  discountCents: z.number().int().min(0).default(0),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item."),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

function budgetStatusLabel(status: string): string {
  if (status === "approved") return "Aprovado";
  if (status === "sent") return "Enviado";
  if (status === "cancelled") return "Cancelado";
  return "Rascunho";
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

async function assertClientInTenant(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  clientId: string,
): Promise<Err | null> {
  const { data: client } = await supabase
    .schema("clinic")
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("tenant_id", tenantId)
    .is("hidden_from_ui_at", null)
    .maybeSingle();

  if (!client) {
    return { ok: false, error: "Paciente não encontrada para orçamento." };
  }
  return null;
}

export async function createBudget(input: CreateBudgetInput): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;
  const clientErr = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    data.clientId,
  );
  if (clientErr) return clientErr;

  const procedureIds = data.items
    .map((item) => item.procedureId ?? null)
    .filter((id): id is string => !!id);

  if (procedureIds.length > 0) {
    const { data: procedures } = await ctx.supabase
      .schema("clinic")
      .from("procedures")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .in("id", procedureIds);

    const allowed = new Set((procedures ?? []).map((p) => p.id));
    const hasInvalid = procedureIds.some((id) => !allowed.has(id));
    if (hasInvalid) {
      return { ok: false, error: "Um ou mais procedimentos não pertencem à clínica." };
    }
  }

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  const total = Math.max(0, subtotal - data.discountCents);

  const { data: budget, error: budgetError } = await ctx.supabase
    .schema("clinic")
    .from("budgets")
    .insert({
      tenant_id: ctx.tenantId,
      client_id: data.clientId,
      title: data.title?.trim() || null,
      status: "draft",
      currency: "BRL",
      subtotal_cents: subtotal,
      discount_cents: data.discountCents,
      total_cents: total,
      valid_until: data.validUntil ?? null,
    })
    .select("id")
    .single();

  if (budgetError || !budget) {
    return { ok: false, error: budgetError?.message ?? "Falha ao criar orçamento." };
  }

  const itemRows = data.items.map((item, index) => ({
    tenant_id: ctx.tenantId,
    budget_id: budget.id,
    procedure_id: item.procedureId ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_price_cents: item.unitPriceCents,
    line_total_cents: item.quantity * item.unitPriceCents,
    display_order: index + 1,
  }));

  const { error: itemsError } = await ctx.supabase
    .schema("clinic")
    .from("budget_items")
    .insert(itemRows);

  if (itemsError) {
    await ctx.supabase
      .schema("clinic")
      .from("budgets")
      .delete()
      .eq("id", budget.id)
      .eq("tenant_id", ctx.tenantId);
    return { ok: false, error: itemsError.message ?? "Falha ao salvar itens do orçamento." };
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/pacientes/${data.clientId}`, "layout");
  return { ok: true, id: budget.id };
}

const budgetIdSchema = z.string().uuid();

export async function changeBudgetStatus(
  budgetId: string,
  status: "draft" | "sent" | "approved" | "cancelled",
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = budgetIdSchema.safeParse(budgetId);
  if (!parsed.success) return { ok: false, error: "Orçamento inválido." };

  const updatePayload: {
    status: typeof status;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;
  } = { status };
  if (status === "cancelled") {
    updatePayload.cancelled_at = new Date().toISOString();
    updatePayload.cancellation_reason = "manual";
  } else {
    updatePayload.cancelled_at = null;
    updatePayload.cancellation_reason = null;
  }

  const { data: budget, error } = await ctx.supabase
    .schema("clinic")
    .from("budgets")
    .update(updatePayload)
    .eq("id", parsed.data)
    .eq("tenant_id", ctx.tenantId)
    .select("id, client_id, title, total_cents")
    .single();

  if (error || !budget) {
    return { ok: false, error: error?.message ?? "Falha ao atualizar status." };
  }

  if (status === "approved") {
    await dispatchBudgetApproved(ctx.supabase, ctx.tenantId, {
      id: budget.id,
      title: budget.title,
      total_cents: budget.total_cents ?? 0,
      client_id: budget.client_id,
    });
  } else if (status === "cancelled") {
    await dispatchBudgetCancelled(
      ctx.supabase,
      ctx.tenantId,
      budget.id,
      "Orçamento cancelado",
    );
  }

  revalidatePath("/orcamentos");
  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${budget.client_id}`, "layout");
  return { ok: true };
}

export async function convertBudgetToPurchase(budgetId: string): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = budgetIdSchema.safeParse(budgetId);
  if (!parsed.success) return { ok: false, error: "Orçamento inválido." };

  const { data: budget } = await ctx.supabase
    .schema("clinic")
    .from("budgets")
    .select("id, client_id, title, total_cents")
    .eq("id", parsed.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!budget) return { ok: false, error: "Orçamento não encontrado." };

  const { data: existing } = await ctx.supabase
    .schema("clinic")
    .from("client_procedure_purchases")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("budget_id", budget.id)
    .maybeSingle();

  if (existing?.id) {
    return { ok: false, error: "Este orçamento já está lançado no financeiro." };
  }

  const purchaseTitle = budget.title?.trim() || "Orçamento convertido";
  const { data: purchaseRow, error: purchaseError } = await ctx.supabase
    .schema("clinic")
    .from("client_procedure_purchases")
    .insert({
      tenant_id: ctx.tenantId,
      client_id: budget.client_id,
      title: purchaseTitle,
      budget_id: budget.id,
      total_cents: budget.total_cents ?? 0,
      currency: "BRL",
      notes: "Lançamento automático a partir de orçamento.",
      responsible_profile_id: ctx.userId,
    })
    .select("id")
    .single();

  if (purchaseError || !purchaseRow) {
    return {
      ok: false,
      error: purchaseError?.message ?? "Não foi possível lançar no financeiro.",
    };
  }

  await ctx.supabase
    .schema("clinic")
    .from("budgets")
    .update({ status: "approved" })
    .eq("id", budget.id)
    .eq("tenant_id", ctx.tenantId);

  // Cancela o pendente do orçamento (se existir) e registra a venda paga.
  await dispatchBudgetCancelled(
    ctx.supabase,
    ctx.tenantId,
    budget.id,
    "Convertido em venda",
  );
  await dispatchSaleCreated(ctx.supabase, ctx.tenantId, {
    id: purchaseRow.id,
    title: purchaseTitle,
    total_cents: budget.total_cents ?? 0,
    client_id: budget.client_id,
    responsible_profile_id: ctx.userId,
  });

  revalidatePath("/orcamentos");
  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${budget.client_id}`, "layout");
  return { ok: true };
}

const generateBudgetPdfSchema = z.object({
  budgetId: z.string().uuid(),
  brandingProfileId: z.string().uuid().nullable().optional(),
});

export async function generateBudgetPdf(
  input:
    | string
    | {
        budgetId: string;
        brandingProfileId?: string | null;
      },
): Promise<Ok<{ url: string; documentId: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const normalized =
    typeof input === "string"
      ? { budgetId: input, brandingProfileId: null }
      : input;
  const parsed = generateBudgetPdfSchema.safeParse(normalized);
  if (!parsed.success) return { ok: false, error: "Orçamento inválido." };

  const [{ data: budget }, { data: items }, { data: clinicProfile }] = await Promise.all([
    ctx.supabase
      .schema("clinic")
      .from("budgets")
      .select("id, client_id, title, status, subtotal_cents, discount_cents, total_cents, created_at, valid_until")
      .eq("id", parsed.data.budgetId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    ctx.supabase
      .schema("clinic")
      .from("budget_items")
      .select("description, quantity, unit_price_cents, line_total_cents")
      .eq("budget_id", parsed.data.budgetId)
      .eq("tenant_id", ctx.tenantId)
      .order("display_order", { ascending: true }),
    ctx.supabase
      .schema("clinic")
      .from("profiles")
      .select("full_name")
      .eq("id", ctx.userId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
  ]);

  if (!budget) return { ok: false, error: "Orçamento não encontrado." };
  if (!items || items.length === 0) {
    return { ok: false, error: "Não há itens para exportar neste orçamento." };
  }

  const { data: client } = await ctx.supabase
    .schema("clinic")
    .from("clients")
    .select("full_name")
    .eq("id", budget.client_id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const branding = await resolveBrandingForPdf({
    supabase: ctx.supabase,
    tenantId: ctx.tenantId,
    pdfDoc: doc,
    profileId: parsed.data.brandingProfileId ?? null,
  });

  const addPageWithBranding = () => {
    const newPage = doc.addPage([595.28, 841.89]);
    if (branding) drawBrandingOnPage(newPage, branding);
    return newPage;
  };

  let page = addPageWithBranding();
  let box = computeContentBox({ page, applied: branding });
  let y = box.y + box.height;
  const leftX = box.x;
  const rightX = box.x + box.width;
  const minY = box.y + 12;

  const ensureSpace = (needed: number) => {
    if (y - needed < minY) {
      page = addPageWithBranding();
      box = computeContentBox({ page, applied: branding });
      y = box.y + box.height;
    }
  };

  page.drawText("Orçamento de Procedimentos", {
    x: leftX,
    y: y - 14,
    size: 18,
    font: bold,
    color: rgb(0.12, 0.2, 0.18),
  });
  y -= 40;
  page.drawText(`Paciente: ${client?.full_name ?? "Paciente"}`, {
    x: leftX,
    y,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 16;
  page.drawText(`Responsável: ${clinicProfile?.full_name ?? "Profissional"}`, {
    x: leftX,
    y,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 16;
  page.drawText(`Status: ${budgetStatusLabel(budget.status)}`, {
    x: leftX,
    y,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 16;
  page.drawText(
    `Emitido em: ${new Date().toLocaleString("pt-BR")} · Válido até: ${
      budget.valid_until
        ? new Date(budget.valid_until).toLocaleDateString("pt-BR")
        : "não informado"
    }`,
    {
      x: leftX,
      y,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    },
  );

  y -= 28;
  page.drawText("Itens", { x: leftX, y, size: 12, font: bold });
  y -= 16;
  for (const item of items) {
    ensureSpace(16);
    const line = `${item.quantity}x ${item.description}`;
    const value = formatCurrency(item.line_total_cents ?? item.quantity * item.unit_price_cents);
    const valueWidth = bold.widthOfTextAtSize(value, 10);
    page.drawText(line.slice(0, 68), { x: leftX, y, size: 10, font });
    page.drawText(value, {
      x: rightX - valueWidth,
      y,
      size: 10,
      font: bold,
    });
    y -= 14;
  }

  ensureSpace(60);
  y -= 12;
  const totalsX = Math.max(leftX, rightX - 220);
  page.drawText(`Subtotal: ${formatCurrency(budget.subtotal_cents ?? 0)}`, {
    x: totalsX,
    y,
    size: 10,
    font,
  });
  y -= 14;
  page.drawText(`Desconto: ${formatCurrency(budget.discount_cents ?? 0)}`, {
    x: totalsX,
    y,
    size: 10,
    font,
  });
  y -= 16;
  page.drawText(`Total final: ${formatCurrency(budget.total_cents ?? 0)}`, {
    x: totalsX,
    y,
    size: 12,
    font: bold,
    color: rgb(0.12, 0.2, 0.18),
  });

  const bytes = await doc.save();
  const path = buildClinicalStoragePath({
    tenantId: ctx.tenantId,
    clientId: budget.client_id,
    category: "documents",
    originalFileName: `orcamento-${budget.id}.pdf`,
  });

  const { error: uploadError } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .upload(path, Buffer.from(bytes), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message ?? "Falha ao gerar PDF." };
  }

  const { data: documentRow, error: docError } = await ctx.supabase
    .schema("clinic")
    .from("documents")
    .insert({
      tenant_id: ctx.tenantId,
      client_id: budget.client_id,
      kind: "other",
      title: `Orçamento ${budget.title?.trim() || budget.id.slice(0, 8)}`,
      storage_key: path,
      mime_type: "application/pdf",
      responsible_profile_id: ctx.userId,
    })
    .select("id")
    .single();

  if (docError || !documentRow) {
    return { ok: false, error: docError?.message ?? "Falha ao registrar PDF do orçamento." };
  }

  const { data: signed } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 3);

  if (!signed?.signedUrl) {
    return { ok: false, error: "PDF gerado, mas não foi possível criar link de compartilhamento." };
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/pacientes/${budget.client_id}`, "layout");
  revalidatePath(`/pacientes/${budget.client_id}/anexos`);

  return { ok: true, url: signed.signedUrl, documentId: documentRow.id };
}
