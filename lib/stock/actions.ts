"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import {
  procedureSchema,
  procedureUpdateSchema,
  productSchema,
  productUpdateSchema,
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
  if (p.stock_quantity !== undefined) patch.stock_quantity = p.stock_quantity;
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
