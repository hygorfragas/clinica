"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClientPurchaseSchema } from "@/lib/validations/client-purchase";
import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";

type ActionError = { ok: false; error: string };
type ActionOk = { ok: true };

async function assertClientInTenant(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  clientId: string,
): Promise<boolean> {
  const { data } = await supabase
    .schema("clinic")
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("tenant_id", tenantId)
    .is("hidden_from_ui_at", null)
    .maybeSingle();
  return !!data;
}

export async function createClientPurchase(
  raw: unknown,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = createClientPurchaseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const d = parsed.data;
  const okClient = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    d.clientId,
  );
  if (!okClient) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  if (d.contractDocumentId) {
    const { data: doc } = await ctx.supabase
      .schema("clinic")
      .from("documents")
      .select("id")
      .eq("id", d.contractDocumentId)
      .eq("client_id", d.clientId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (!doc) {
      return { ok: false, error: "Contrato selecionado não pertence a esta paciente." };
    }
  }

  if (d.procedureId) {
    const { data: proc } = await ctx.supabase
      .schema("clinic")
      .from("procedures")
      .select("id")
      .eq("id", d.procedureId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (!proc) {
      return { ok: false, error: "Procedimento do catálogo inválido." };
    }
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("client_procedure_purchases")
    .insert({
      tenant_id: ctx.tenantId,
      client_id: d.clientId,
      title: d.title,
      total_cents: d.totalCents,
      currency: "BRL",
      purchased_at: new Date(d.purchasedAt).toISOString(),
      contract_document_id: d.contractDocumentId ?? null,
      procedure_id: d.procedureId ?? null,
      responsible_profile_id: ctx.userId,
      notes: d.notes?.trim() ? d.notes.trim().slice(0, 2000) : null,
    });

  if (error) {
    return { ok: false, error: error.message ?? "Erro ao registrar a compra." };
  }

  revalidatePath(`/pacientes/${d.clientId}`, "layout");
  return { ok: true };
}

const updateContractSchema = z.object({
  clientId: z.string().uuid(),
  purchaseId: z.string().uuid(),
  contractDocumentId: z.string().uuid().nullable(),
});

export async function linkPurchaseToContract(
  raw: unknown,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = updateContractSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const { clientId, purchaseId, contractDocumentId } = parsed.data;

  const { data: purchase } = await ctx.supabase
    .schema("clinic")
    .from("client_procedure_purchases")
    .select("id, client_id")
    .eq("id", purchaseId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!purchase || purchase.client_id !== clientId) {
    return { ok: false, error: "Registro de compra inválido." };
  }

  if (contractDocumentId) {
    const { data: doc } = await ctx.supabase
      .schema("clinic")
      .from("documents")
      .select("id")
      .eq("id", contractDocumentId)
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (!doc) {
      return { ok: false, error: "Contrato inválido para esta paciente." };
    }
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("client_procedure_purchases")
    .update({ contract_document_id: contractDocumentId })
    .eq("id", purchaseId)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Erro ao vincular contrato." };
  }

  revalidatePath(`/pacientes/${clientId}`, "layout");
  return { ok: true };
}
