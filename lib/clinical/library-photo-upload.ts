import { z } from "zod";
import { BODY_REGIONS } from "@/lib/clinical/body-regions";
import { assertPhotoFileSignature } from "@/lib/clinical/photo-file-validation";
import {
  generatePhotoThumb,
  thumbStorageKey,
} from "@/lib/clinical/photo-thumb";
import {
  assertPhotoMime,
  buildClinicalStoragePath,
  CLINICAL_BUCKET,
} from "@/lib/clinical/storage";
import type { ClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";

export type LibraryPhotoUploadOk = { ok: true; photoId: string };
export type LibraryPhotoUploadErr = { ok: false; error: string };
export type LibraryPhotoUploadResult = LibraryPhotoUploadOk | LibraryPhotoUploadErr;

export async function assertClientVisibleInTenant(
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

async function prepareLibraryPhotoBuffer(
  file: File,
): Promise<{ buffer: Buffer; contentType: string } | { error: string }> {
  const mimeErr = assertPhotoMime(file.type);
  if (mimeErr) return { error: mimeErr };
  const buffer = Buffer.from(await file.arrayBuffer());
  const sigErr = assertPhotoFileSignature(buffer);
  if (sigErr) return { error: sigErr };
  return { buffer, contentType: file.type };
}

export type LibraryPhotoUploadInput = {
  captured_at: string;
  file: File;
  caption?: string | null;
};

/**
 * Upload de uma foto na biblioteca do prontuário (original + thumb WebP).
 * Usado pela API route e pela Server Action (wrapper).
 */
export async function uploadPatientLibraryPhotoCore(
  ctx: ClinicalTenantContext,
  clientId: string,
  input: LibraryPhotoUploadInput,
): Promise<LibraryPhotoUploadResult> {
  const clientParsed = z.string().uuid().safeParse(clientId);
  if (!clientParsed.success) {
    return { ok: false, error: "Paciente inválido." };
  }

  const belongs = await assertClientVisibleInTenant(
    ctx.supabase,
    ctx.tenantId,
    clientParsed.data,
  );
  if (!belongs) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  const capturedParsed = z.string().datetime().safeParse(input.captured_at);
  if (!capturedParsed.success) {
    return { ok: false, error: "Informe a data e hora da captura." };
  }
  const captured_at = capturedParsed.data;
  const taken_at = captured_at.slice(0, 10);

  if (!(input.file instanceof Blob) || input.file.size === 0) {
    return { ok: false, error: "Selecione uma imagem." };
  }

  const prepared = await prepareLibraryPhotoBuffer(input.file as File);
  if ("error" in prepared) {
    return { ok: false, error: prepared.error };
  }
  const { buffer, contentType } = prepared;

  const caption =
    typeof input.caption === "string" && input.caption.trim() !== ""
      ? input.caption.trim().slice(0, 500)
      : null;

  const path = buildClinicalStoragePath({
    tenantId: ctx.tenantId,
    clientId: clientParsed.data,
    category: "photos",
    originalFileName: (input.file as File).name ?? "arquivo",
  });

  const { error: upErr } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (upErr) {
    return {
      ok: false,
      error:
        upErr.message ??
        "Falha no upload. Confira o bucket clinical e as políticas de Storage.",
    };
  }

  let thumbPath: string | null = null;
  try {
    const thumbBuffer = await generatePhotoThumb(buffer);
    thumbPath = thumbStorageKey(path);
    const { error: thumbErr } = await ctx.supabase.storage
      .from(CLINICAL_BUCKET)
      .upload(thumbPath, thumbBuffer, {
        contentType: "image/webp",
        upsert: false,
      });
    if (thumbErr) {
      await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
      return {
        ok: false,
        error: thumbErr.message ?? "Falha ao gerar miniatura.",
      };
    }
  } catch (err) {
    console.error("[library-photo-upload] thumb:", err);
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
    return { ok: false, error: "Falha ao processar a imagem." };
  }

  const { data: inserted, error: dbErr } = await ctx.supabase
    .schema("clinic")
    .from("photos")
    .insert({
      tenant_id: ctx.tenantId,
      client_id: clientParsed.data,
      storage_key: path,
      caption,
      taken_at,
      captured_at,
      body_region: BODY_REGIONS.other,
      capture_angle: null,
      purchase_id: null,
      comparison_role: null,
    })
    .select("id")
    .single();

  if (dbErr || !inserted) {
    const toRemove = thumbPath ? [path, thumbPath] : [path];
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove(toRemove);
    return {
      ok: false,
      error: dbErr?.message ?? "Erro ao registrar foto.",
    };
  }

  return { ok: true, photoId: inserted.id };
}
