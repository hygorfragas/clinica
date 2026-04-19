"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requireClinicalTenantContext,
  type ClinicSupabaseClient,
} from "@/lib/clients/clinical-tenant-context";
import {
  assertDocumentMime,
  buildContractTemplateStoragePath,
  CLINICAL_BUCKET,
  MAX_DOCUMENT_BYTES,
} from "@/lib/clinical/storage";

type ActionError = { ok: false; error: string };
type ActionOk = { ok: true };

const titleSchema = z.string().trim().min(2, "Informe um título").max(200);
const bodyHtmlSchema = z.string().max(400_000);
const idSchema = z.string().uuid("Identificador inválido.");

async function unsetDefaultsForTenant(tenantId: string, supabase: ClinicSupabaseClient) {
  await supabase
    .schema("clinic")
    .from("contract_templates")
    .update({ is_default: false })
    .eq("tenant_id", tenantId)
    .eq("is_default", true);
}

export async function createContractTemplateFromEditor(input: {
  title: string;
  bodyHtml: string;
  isDefault: boolean;
}): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const t = titleSchema.safeParse(input.title);
  const b = bodyHtmlSchema.safeParse(input.bodyHtml ?? "");
  if (!t.success) return { ok: false, error: t.error.errors[0]?.message ?? "Título inválido" };
  if (!b.success) return { ok: false, error: b.error.errors[0]?.message ?? "Texto inválido" };
  if (b.data.replace(/<[^>]+>/g, "").trim().length < 15) {
    return { ok: false, error: "O contrato no editor está muito curto." };
  }

  if (input.isDefault) {
    await unsetDefaultsForTenant(ctx.tenantId, ctx.supabase);
  }

  const { error } = await ctx.supabase.schema("clinic").from("contract_templates").insert({
    tenant_id: ctx.tenantId,
    title: t.data,
    body_html: b.data,
    storage_key: null,
    mime_type: null,
    is_default: input.isDefault,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Não foi possível salvar o modelo." };
  }

  revalidatePath("/configuracoes/contratos");
  return { ok: true };
}

export async function createContractTemplateFromFile(formData: FormData): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const titleRaw = formData.get("title");
  const t = titleSchema.safeParse(typeof titleRaw === "string" ? titleRaw : "");
  if (!t.success) return { ok: false, error: t.error.errors[0]?.message ?? "Título inválido" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um PDF ou imagem." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx. 20 MB)." };
  }
  const mimeErr = assertDocumentMime(file.type);
  if (mimeErr) return { ok: false, error: mimeErr };

  const isDefault = formData.get("is_default") === "1" || formData.get("is_default") === "true";

  if (isDefault) {
    await unsetDefaultsForTenant(ctx.tenantId, ctx.supabase);
  }

  const path = buildContractTemplateStoragePath({
    tenantId: ctx.tenantId,
    originalFileName: file.name,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await ctx.supabase.storage.from(CLINICAL_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (upErr) {
    return { ok: false, error: upErr.message ?? "Falha no upload." };
  }

  const { error: dbErr } = await ctx.supabase.schema("clinic").from("contract_templates").insert({
    tenant_id: ctx.tenantId,
    title: t.data,
    body_html: null,
    storage_key: path,
    mime_type: file.type,
    is_default: isDefault,
  });

  if (dbErr) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
    return { ok: false, error: dbErr.message ?? "Erro ao registrar modelo." };
  }

  revalidatePath("/configuracoes/contratos");
  return { ok: true };
}

export async function updateContractTemplateFromEditor(input: {
  id: string;
  title: string;
  bodyHtml: string;
  isDefault: boolean;
}): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = idSchema.safeParse(input.id);
  const t = titleSchema.safeParse(input.title);
  const b = bodyHtmlSchema.safeParse(input.bodyHtml ?? "");
  if (!id.success) return { ok: false, error: id.error.errors[0]?.message ?? "Id inválido" };
  if (!t.success) return { ok: false, error: t.error.errors[0]?.message ?? "Título inválido" };
  if (!b.success) return { ok: false, error: b.error.errors[0]?.message ?? "Texto inválido" };
  if (b.data.replace(/<[^>]+>/g, "").trim().length < 15) {
    return { ok: false, error: "O contrato no editor está muito curto." };
  }

  const { data: existing, error: exErr } = await ctx.supabase
    .schema("clinic")
    .from("contract_templates")
    .select("id, storage_key")
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (exErr || !existing) {
    return { ok: false, error: "Modelo não encontrado." };
  }

  if (existing.storage_key) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([existing.storage_key]);
  }

  if (input.isDefault) {
    await unsetDefaultsForTenant(ctx.tenantId, ctx.supabase);
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("contract_templates")
    .update({
      title: t.data,
      body_html: b.data,
      storage_key: null,
      mime_type: null,
      is_default: input.isDefault,
    })
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Não foi possível atualizar." };
  }

  revalidatePath("/configuracoes/contratos");
  return { ok: true };
}

export async function setDefaultContractTemplate(templateId: string): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = idSchema.safeParse(templateId);
  if (!id.success) return { ok: false, error: id.error.errors[0]?.message ?? "Id inválido" };

  const { data: row } = await ctx.supabase
    .schema("clinic")
    .from("contract_templates")
    .select("id")
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Modelo não encontrado." };
  }

  await unsetDefaultsForTenant(ctx.tenantId, ctx.supabase);

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("contract_templates")
    .update({ is_default: true })
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Não foi possível definir padrão." };
  }

  revalidatePath("/configuracoes/contratos");
  return { ok: true };
}

export async function deleteContractTemplate(templateId: string): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = idSchema.safeParse(templateId);
  if (!id.success) return { ok: false, error: id.error.errors[0]?.message ?? "Id inválido" };

  const { data: row } = await ctx.supabase
    .schema("clinic")
    .from("contract_templates")
    .select("storage_key")
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Modelo não encontrado." };
  }

  if (row.storage_key) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([row.storage_key]);
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("contract_templates")
    .delete()
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Não foi possível excluir." };
  }

  revalidatePath("/configuracoes/contratos");
  return { ok: true };
}
