"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requireClinicalTenantContext,
  type ClinicSupabaseClient,
} from "@/lib/clients/clinical-tenant-context";
import {
  buildEvolutionTemplateStoragePath,
  CLINICAL_BUCKET,
  MAX_DOCUMENT_BYTES,
} from "@/lib/clinical/storage";
import {
  anamnesisFieldsSchema,
  anamnesisInkRegionsSchema,
  type AnamnesisField,
  type AnamnesisInkRegion,
} from "@/lib/anamnesis/template-schema";

type Ok = { ok: true };
type OkId = { ok: true; id: string };
type Err = { ok: false; error: string };

const nameSchema = z.string().trim().min(2).max(160);
const descSchema = z.string().trim().max(600).optional();
const idSchema = z.string().uuid();

type FormDataFileLike = {
  size: number;
  type: string;
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function isFormDataFileLike(value: unknown): value is FormDataFileLike {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FormDataFileLike>;
  return (
    typeof candidate.size === "number" &&
    typeof candidate.type === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.arrayBuffer === "function"
  );
}

async function unsetDefaults(tenantId: string, supabase: ClinicSupabaseClient) {
  await supabase
    .schema("clinic")
    .from("evolution_templates")
    .update({ is_default: false })
    .eq("tenant_id", tenantId)
    .eq("is_default", true);
}

export async function createEvolutionTemplate(
  formData: FormData,
): Promise<OkId | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const nameRaw = formData.get("name");
  const descRaw = formData.get("description");
  const file = formData.get("file");
  const isDefaultRaw = formData.get("is_default");
  const pageCountRaw = formData.get("page_count");

  const name = nameSchema.safeParse(typeof nameRaw === "string" ? nameRaw : "");
  if (!name.success) {
    return {
      ok: false,
      error: name.error.issues[0]?.message ?? "Nome inválido.",
    };
  }
  const desc = descSchema.safeParse(
    typeof descRaw === "string" && descRaw.trim().length > 0
      ? descRaw
      : undefined,
  );
  if (!desc.success) {
    return { ok: false, error: "Descrição inválida." };
  }

  if (!isFormDataFileLike(file) || file.size === 0) {
    return { ok: false, error: "Selecione o arquivo PDF da ficha." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx. 20 MB)." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "A ficha deve ser um arquivo PDF." };
  }

  const isDefault =
    isDefaultRaw === "1" || isDefaultRaw === "true" || isDefaultRaw === "on";
  const pageCount = Number(pageCountRaw);
  const pageCountSafe =
    Number.isFinite(pageCount) && pageCount > 0
      ? Math.max(1, Math.floor(pageCount))
      : 1;

  const templateId = randomUUID();
  const storagePath = buildEvolutionTemplateStoragePath({
    tenantId: ctx.tenantId,
    templateId,
    originalFileName: file.name,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) {
    return { ok: false, error: upErr.message ?? "Falha no upload do PDF." };
  }

  if (isDefault) {
    await unsetDefaults(ctx.tenantId, ctx.supabase);
  }

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("evolution_templates")
    .insert({
      id: templateId,
      tenant_id: ctx.tenantId,
      name: name.data,
      description: desc.data ?? null,
      pdf_storage_path: storagePath,
      page_count: pageCountSafe,
      form_schema: [],
      ink_regions: [],
      is_default: isDefault,
    })
    .select("id")
    .single();

  if (error || !data) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([storagePath]);
    return {
      ok: false,
      error: error?.message ?? "Não foi possível criar a ficha.",
    };
  }

  revalidatePath("/configuracoes/evolucao");
  return { ok: true, id: data.id };
}

type UpdateTemplateInput = {
  id: string;
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  isArchived?: boolean;
  pageCount?: number;
  formSchema?: AnamnesisField[];
  inkRegions?: AnamnesisInkRegion[];
};

export async function updateEvolutionTemplate(
  input: UpdateTemplateInput,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = idSchema.safeParse(input.id);
  if (!id.success) return { ok: false, error: "Identificador inválido." };

  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const parsed = nameSchema.safeParse(input.name);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Nome inválido.",
      };
    }
    payload.name = parsed.data;
  }
  if (input.description !== undefined) {
    if (input.description === null || input.description === "") {
      payload.description = null;
    } else {
      const parsed = descSchema.safeParse(input.description);
      if (!parsed.success) {
        return { ok: false, error: "Descrição inválida." };
      }
      payload.description = parsed.data ?? null;
    }
  }
  if (input.isArchived !== undefined) payload.is_archived = input.isArchived;
  if (input.pageCount !== undefined) {
    payload.page_count = Math.max(1, Math.floor(input.pageCount));
  }
  if (input.formSchema !== undefined) {
    const parsed = anamnesisFieldsSchema.safeParse(input.formSchema);
    if (!parsed.success) {
      return { ok: false, error: "Estrutura de campos inválida." };
    }
    payload.form_schema = parsed.data;
  }
  if (input.inkRegions !== undefined) {
    const parsed = anamnesisInkRegionsSchema.safeParse(input.inkRegions);
    if (!parsed.success) {
      return { ok: false, error: "Áreas de desenho inválidas." };
    }
    payload.ink_regions = parsed.data;
  }

  if (input.isDefault) {
    await unsetDefaults(ctx.tenantId, ctx.supabase);
    payload.is_default = true;
  } else if (input.isDefault === false) {
    payload.is_default = false;
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("evolution_templates")
    .update(payload)
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Não foi possível atualizar a ficha.",
    };
  }

  revalidatePath("/configuracoes/evolucao");
  return { ok: true };
}

export async function deleteEvolutionTemplate(
  templateId: string,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const id = idSchema.safeParse(templateId);
  if (!id.success) return { ok: false, error: "Identificador inválido." };

  const { data: tpl } = await ctx.supabase
    .schema("clinic")
    .from("evolution_templates")
    .select("pdf_storage_path")
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!tpl) return { ok: false, error: "Ficha não encontrada." };

  if (tpl.pdf_storage_path) {
    await ctx.supabase.storage
      .from(CLINICAL_BUCKET)
      .remove([tpl.pdf_storage_path]);
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("evolution_templates")
    .delete()
    .eq("id", id.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Não foi possível excluir a ficha.",
    };
  }

  revalidatePath("/configuracoes/evolucao");
  return { ok: true };
}
