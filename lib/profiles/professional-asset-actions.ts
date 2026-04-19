"use server";

import { revalidatePath } from "next/cache";
import {
  assertSignatureMime,
  buildProfileAssetStoragePath,
  CLINICAL_BUCKET,
  MAX_SIGNATURE_BYTES,
} from "@/lib/clinical/storage";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";

type R = { ok: true } | { ok: false; error: string };

async function uploadProfileAsset(
  formData: FormData,
  fieldName: "stamp" | "signature",
  column: "stamp_storage_key" | "signature_storage_key",
): Promise<R> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo de imagem." };
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx. 5 MB)." };
  }
  const mimeErr = assertSignatureMime(file.type);
  if (mimeErr) return { ok: false, error: mimeErr };

  const { data: prev } = await ctx.supabase
    .schema("clinic")
    .from("profiles")
    .select("stamp_storage_key, signature_storage_key")
    .eq("id", ctx.userId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  const path = buildProfileAssetStoragePath({
    tenantId: ctx.tenantId,
    profileId: ctx.userId,
    kind: fieldName === "stamp" ? "stamp" : "signature",
    originalFileName: file.name,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) {
    return { ok: false, error: upErr.message ?? "Falha no upload." };
  }

  const { error: dbErr } = await ctx.supabase
    .schema("clinic")
    .from("profiles")
    .update({ [column]: path })
    .eq("id", ctx.userId)
    .eq("tenant_id", ctx.tenantId);

  if (dbErr) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
    return { ok: false, error: dbErr.message ?? "Erro ao salvar." };
  }

  const oldKey =
    column === "stamp_storage_key"
      ? prev?.stamp_storage_key
      : prev?.signature_storage_key;
  if (typeof oldKey === "string" && oldKey.trim() && oldKey !== path) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([oldKey]);
  }

  revalidatePath("/configuracoes/profissional");
  return { ok: true };
}

export async function uploadMyProfileStamp(formData: FormData): Promise<R> {
  return uploadProfileAsset(formData, "stamp", "stamp_storage_key");
}

export async function uploadMyProfileSignature(formData: FormData): Promise<R> {
  return uploadProfileAsset(formData, "signature", "signature_storage_key");
}
