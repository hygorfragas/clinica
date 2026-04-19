"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import { computeSaleFeasibility } from "./completeness";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string; missing?: string[] };

const createSaleSchema = z.object({
  clientId: z.string().uuid(),
  procedureId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  totalCents: z.number().int().min(0),
  notes: z.string().trim().max(2000).optional().nullable(),
  budgetId: z.string().uuid().optional().nullable(),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export async function createSale(
  input: CreateSaleInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const feas = await computeSaleFeasibility(
    ctx.supabase,
    ctx.tenantId,
    data.clientId,
    data.procedureId,
  );
  if (!feas.canSell) {
    return {
      ok: false,
      error: "Paciente incompleto para venda.",
      missing: feas.missing,
    };
  }

  const { data: proc } = await ctx.supabase
    .schema("clinic")
    .from("procedures")
    .select("id, name, contract_template_id, price_cents")
    .eq("id", data.procedureId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!proc) return { ok: false, error: "Procedimento não encontrado." };

  let contractDocId: string | null = null;
  if (proc.contract_template_id) {
    const { data: doc } = await ctx.supabase
      .schema("clinic")
      .from("documents")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("client_id", data.clientId)
      .eq("source_template_id", proc.contract_template_id)
      .not("signed_at", "is", null)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    contractDocId = doc?.id ?? null;
  }

  const { data: row, error } = await ctx.supabase
    .schema("clinic")
    .from("client_procedure_purchases")
    .insert({
      tenant_id: ctx.tenantId,
      client_id: data.clientId,
      title: data.title?.trim() || proc.name,
      procedure_id: data.procedureId,
      budget_id: data.budgetId ?? null,
      total_cents: data.totalCents,
      notes: data.notes?.trim() || null,
      contract_document_id: contractDocId,
      responsible_profile_id: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Falha ao registrar venda." };
  }

  revalidatePath("/vendas");
  revalidatePath(`/pacientes/${data.clientId}`, "layout");
  return { ok: true, id: row.id };
}
