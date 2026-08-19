"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import {
  consumeAppointmentStockSchema,
  procedureBomItemSchema,
  procedureSchema,
  procedureUpdateSchema,
  productSchema,
  productUpdateSchema,
  type ConsumeAppointmentStockInput,
  type ProcedureInput,
  type ProcedureUpdateInput,
  type ProductInput,
  type ProductUpdateInput,
} from "./schemas";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

const uuidSchema = z.string().uuid();

function normalizeSku(v?: string | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

// ----- Produtos --------------------------------------------------------------

export async function createProduct(
  input: ProductInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const { data: row, error } = await ctx.supabase
    .schema("clinic")
    .from("products")
    .insert({
      tenant_id: ctx.tenantId,
      name: data.name,
      sku: normalizeSku(data.sku),
      description: data.description?.trim() || null,
      unit: data.unit,
      stock_quantity: data.stock_quantity,
      low_stock_threshold: data.low_stock_threshold,
      cost_cents: data.cost_cents,
      price_cents: data.price_cents,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Falha ao criar produto." };
  }

  revalidatePath("/estoque");
  return { ok: true, id: row.id };
}

export async function updateProduct(
  productId: string,
  input: ProductUpdateInput,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = uuidSchema.safeParse(productId);
  if (!id.success) return { ok: false, error: "ID inválido." };

  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const patch: Record<string, unknown> = {};
  const p = parsed.data;
  if (p.name !== undefined) patch.name = p.name;
  if (p.sku !== undefined) patch.sku = normalizeSku(p.sku);
  if (p.description !== undefined) patch.description = p.description?.trim() || null;
  if (p.unit !== undefined) patch.unit = p.unit;
  if (p.low_stock_threshold !== undefined)
    patch.low_stock_threshold = p.low_stock_threshold;
  if (p.cost_cents !== undefined) patch.cost_cents = p.cost_cents;
  if (p.price_cents !== undefined) patch.price_cents = p.price_cents;

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("products")
    .update(patch)
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/estoque");
  return { ok: true };
}

export async function setProductArchived(
  productId: string,
  archived: boolean,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = uuidSchema.safeParse(productId);
  if (!id.success) return { ok: false, error: "ID inválido." };

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("products")
    .update({ is_archived: archived })
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/estoque");
  return { ok: true };
}

export async function adjustProductStock(
  productId: string,
  delta: number,
  opts: {
    reason?:
      | "purchase"
      | "manual_adjustment"
      | "consumption"
      | "sale"
      | "loss"
      | "return";
    note?: string | null;
  } = {},
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = uuidSchema.safeParse(productId);
  if (!id.success) return { ok: false, error: "ID inválido." };
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "Informe uma variação válida." };
  }

  const { error } = await ctx.supabase.schema("clinic").rpc(
    "apply_inventory_movement",
    {
      p_tenant_id: ctx.tenantId,
      p_product_id: id.data,
      p_delta: delta,
      p_reason: opts.reason ?? "manual_adjustment",
      p_note: opts.note?.trim() || null,
      p_ref_table: null,
      p_ref_id: null,
      p_profile_id: ctx.userId,
    },
  );

  if (error) {
    if (error.code === "STKNG")
      return { ok: false, error: "Estoque insuficiente." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/estoque");
  return { ok: true };
}

// ----- Procedimentos --------------------------------------------------------

export async function createProcedure(
  input: ProcedureInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = procedureSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const p = parsed.data;

  const { data: row, error } = await ctx.supabase
    .schema("clinic")
    .from("procedures")
    .insert({
      tenant_id: ctx.tenantId,
      name: p.name,
      description: p.description?.trim() || null,
      duration_minutes: p.duration_minutes ?? null,
      cost_cents: p.cost_cents,
      profit_margin_percent: p.profit_margin_percent,
      price_cents: p.price_cents,
      default_price_cents: p.price_cents,
      contract_template_id: p.contract_template_id ?? null,
      requires_signed_contract: p.requires_signed_contract,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Falha ao criar procedimento." };
  }

  revalidatePath("/estoque");
  return { ok: true, id: row.id };
}

export async function updateProcedure(
  procedureId: string,
  input: ProcedureUpdateInput,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = uuidSchema.safeParse(procedureId);
  if (!id.success) return { ok: false, error: "ID inválido." };

  const parsed = procedureUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const patch: Record<string, unknown> = {};
  const p = parsed.data;
  if (p.name !== undefined) patch.name = p.name;
  if (p.description !== undefined) patch.description = p.description?.trim() || null;
  if (p.duration_minutes !== undefined) patch.duration_minutes = p.duration_minutes;
  if (p.cost_cents !== undefined) patch.cost_cents = p.cost_cents;
  if (p.profit_margin_percent !== undefined)
    patch.profit_margin_percent = p.profit_margin_percent;
  if (p.price_cents !== undefined) {
    patch.price_cents = p.price_cents;
    patch.default_price_cents = p.price_cents;
  }
  if (p.contract_template_id !== undefined)
    patch.contract_template_id = p.contract_template_id ?? null;
  if (p.requires_signed_contract !== undefined)
    patch.requires_signed_contract = p.requires_signed_contract;

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("procedures")
    .update(patch)
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/estoque");
  return { ok: true };
}

export async function setProcedureArchived(
  procedureId: string,
  archived: boolean,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = uuidSchema.safeParse(procedureId);
  if (!id.success) return { ok: false, error: "ID inválido." };

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("procedures")
    .update({ is_archived: archived })
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/estoque");
  return { ok: true };
}

// ----- BOM (insumos do procedimento) ----------------------------------------

export type ProcedureBomItemRow = {
  id: string;
  procedure_id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_unit: string;
  product_is_archived: boolean;
  stock_quantity: number;
};

export async function listProcedureBom(
  procedureId: string,
): Promise<Ok<{ items: ProcedureBomItemRow[] }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = uuidSchema.safeParse(procedureId);
  if (!id.success) return { ok: false, error: "ID inválido." };

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("procedure_bom_items")
    .select(
      "id, procedure_id, product_id, quantity, products:products(name, unit, is_archived, stock_quantity)",
    )
    .eq("tenant_id", ctx.tenantId)
    .eq("procedure_id", id.data)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const items: ProcedureBomItemRow[] = (data ?? []).map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    return {
      id: row.id,
      procedure_id: row.procedure_id,
      product_id: row.product_id,
      quantity: Number(row.quantity),
      product_name: product?.name ?? "Produto",
      product_unit: product?.unit ?? "un",
      product_is_archived: Boolean(product?.is_archived),
      stock_quantity: Number(product?.stock_quantity ?? 0),
    };
  });

  return { ok: true, items };
}

export async function upsertProcedureBomItem(
  procedureId: string,
  input: { productId: string; quantity: number },
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = uuidSchema.safeParse(procedureId);
  if (!id.success) return { ok: false, error: "ID inválido." };

  const parsed = procedureBomItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { data: product, error: productError } = await ctx.supabase
    .schema("clinic")
    .from("products")
    .select("id, is_archived")
    .eq("id", parsed.data.productId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (productError) return { ok: false, error: productError.message };
  if (!product) return { ok: false, error: "Produto não encontrado." };
  if (product.is_archived) {
    return { ok: false, error: "Produto excluído não pode entrar no BOM." };
  }

  const { data: procedure, error: procedureError } = await ctx.supabase
    .schema("clinic")
    .from("procedures")
    .select("id")
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (procedureError) return { ok: false, error: procedureError.message };
  if (!procedure) return { ok: false, error: "Procedimento não encontrado." };

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("procedure_bom_items")
    .upsert(
      {
        tenant_id: ctx.tenantId,
        procedure_id: id.data,
        product_id: parsed.data.productId,
        quantity: parsed.data.quantity,
      },
      { onConflict: "procedure_id,product_id" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/estoque");
  return { ok: true };
}

export async function removeProcedureBomItem(
  procedureId: string,
  productId: string,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const procId = uuidSchema.safeParse(procedureId);
  const prodId = uuidSchema.safeParse(productId);
  if (!procId.success || !prodId.success) {
    return { ok: false, error: "ID inválido." };
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("procedure_bom_items")
    .delete()
    .eq("tenant_id", ctx.tenantId)
    .eq("procedure_id", procId.data)
    .eq("product_id", prodId.data);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/estoque");
  return { ok: true };
}

export type AppointmentConsumptionItem = {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  stockQuantity: number;
  isArchived: boolean;
};

export type AppointmentConsumptionPreview = {
  appointmentId: string;
  procedureIds: string[];
  procedureNames: string[];
  alreadyConsumed: boolean;
  items: AppointmentConsumptionItem[];
};

export async function getAppointmentConsumptionPreview(
  appointmentId: string,
  procedureIds?: string[] | null,
): Promise<Ok<{ preview: AppointmentConsumptionPreview | null }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = uuidSchema.safeParse(appointmentId);
  if (!id.success) return { ok: false, error: "ID inválido." };

  const { data: appointment, error: appointmentError } = await ctx.supabase
    .schema("clinic")
    .from("appointments")
    .select("id, procedure_id")
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (appointmentError) return { ok: false, error: appointmentError.message };
  if (!appointment) return { ok: false, error: "Agendamento não encontrado." };

  const { data: linkedRows } = await ctx.supabase
    .schema("clinic")
    .from("appointment_procedures")
    .select("procedure_id, display_order")
    .eq("tenant_id", ctx.tenantId)
    .eq("appointment_id", id.data)
    .order("display_order", { ascending: true });

  const linkedIds = (linkedRows ?? []).map((row) => row.procedure_id);
  const resolvedProcedureIds =
    procedureIds && procedureIds.length > 0
      ? procedureIds
      : linkedIds.length > 0
        ? linkedIds
        : appointment.procedure_id
          ? [appointment.procedure_id]
          : [];

  if (resolvedProcedureIds.length === 0) return { ok: true, preview: null };

  const { data: procedures, error: procedureError } = await ctx.supabase
    .schema("clinic")
    .from("procedures")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId)
    .in("id", resolvedProcedureIds);

  if (procedureError) return { ok: false, error: procedureError.message };
  if (!procedures || procedures.length === 0) return { ok: true, preview: null };

  const nameById = new Map(procedures.map((p) => [p.id, p.name]));
  const procedureNames = resolvedProcedureIds
    .map((procId) => nameById.get(procId))
    .filter((name): name is string => !!name);

  const { data: bomRows, error: bomError } = await ctx.supabase
    .schema("clinic")
    .from("procedure_bom_items")
    .select(
      "product_id, quantity, products:products(name, unit, is_archived, stock_quantity)",
    )
    .eq("tenant_id", ctx.tenantId)
    .in("procedure_id", resolvedProcedureIds);

  if (bomError) return { ok: false, error: bomError.message };
  if (!bomRows || bomRows.length === 0) return { ok: true, preview: null };

  const { count, error: movError } = await ctx.supabase
    .schema("clinic")
    .from("inventory_movements")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .eq("ref_table", "appointments")
    .eq("ref_id", id.data)
    .eq("reason", "consumption");

  if (movError) return { ok: false, error: movError.message };

  const aggregated = new Map<string, AppointmentConsumptionItem>();
  for (const row of bomRows) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const existing = aggregated.get(row.product_id);
    const qty = Number(row.quantity);
    if (existing) {
      existing.quantity += qty;
      continue;
    }
    aggregated.set(row.product_id, {
      productId: row.product_id,
      productName: product?.name ?? "Produto",
      unit: product?.unit ?? "un",
      quantity: qty,
      stockQuantity: Number(product?.stock_quantity ?? 0),
      isArchived: Boolean(product?.is_archived),
    });
  }

  const items = [...aggregated.values()];

  return {
    ok: true,
    preview: {
      appointmentId: id.data,
      procedureIds: resolvedProcedureIds,
      procedureNames,
      alreadyConsumed: (count ?? 0) > 0,
      items,
    },
  };
}

export async function consumeAppointmentStock(
  input: ConsumeAppointmentStockInput,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = consumeAppointmentStockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { appointmentId, items } = parsed.data;

  const { error } = await ctx.supabase.schema("clinic").rpc(
    "consume_appointment_stock",
    {
      p_tenant_id: ctx.tenantId,
      p_appointment_id: appointmentId,
      p_items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      p_profile_id: ctx.userId,
    },
  );

  if (error) {
    switch (error.code) {
      case "ALRDY":
      case "23505":
        return { ok: false, error: "Estoque deste atendimento já foi baixado." };
      case "STKNG":
        return {
          ok: false,
          error: error.message || "Estoque insuficiente.",
        };
      case "ARCHV":
        return {
          ok: false,
          error: error.message || "Produto excluído não pode ser consumido.",
        };
      case "NOBOM":
        return {
          ok: false,
          error: "Produto fora do BOM deste procedimento.",
        };
      case "NTFND":
        return {
          ok: false,
          error: error.message || "Agendamento ou produto não encontrado.",
        };
      default:
        return { ok: false, error: error.message };
    }
  }

  revalidatePath("/estoque");
  revalidatePath("/agenda");
  return { ok: true };
}
