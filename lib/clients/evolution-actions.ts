"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import {
  assertPhotoMime,
  buildClinicalStoragePath,
  CLINICAL_BUCKET,
  MAX_PHOTO_BYTES,
} from "@/lib/clinical/storage";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

const bodySchema = z.string().trim().min(1).max(20_000);
const uuidSchema = z.string().uuid();

type AddEvolutionInput = {
  body: string;
  procedureId?: string | null;
  purchaseId?: string | null;
  sessionNumber?: number | null;
  appointmentId?: string | null;
};

export async function addEvolutionRich(
  clientId: string,
  input: AddEvolutionInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsedBody = bodySchema.safeParse(input.body);
  if (!parsedBody.success) {
    return { ok: false, error: parsedBody.error.issues[0]?.message ?? "Texto inválido." };
  }

  let procedure_id: string | null = null;
  let purchase_id: string | null = null;
  let session_number: number | null = null;
  let appointment_id: string | null = null;

  if (input.procedureId) {
    const ok = uuidSchema.safeParse(input.procedureId);
    if (!ok.success) return { ok: false, error: "Procedimento inválido." };
    procedure_id = ok.data;
  }
  if (input.purchaseId) {
    const ok = uuidSchema.safeParse(input.purchaseId);
    if (!ok.success) return { ok: false, error: "Compra inválida." };
    purchase_id = ok.data;
  }
  if (input.sessionNumber != null) {
    const n = Math.trunc(Number(input.sessionNumber));
    if (Number.isFinite(n) && n > 0) session_number = n;
  }
  if (input.appointmentId) {
    const ok = uuidSchema.safeParse(input.appointmentId);
    if (!ok.success) return { ok: false, error: "Agendamento inválido." };
    appointment_id = ok.data;
  }

  const payload = {
    tenant_id: ctx.tenantId,
    client_id: clientId,
    body: parsedBody.data,
    created_by_profile_id: ctx.userId,
    procedure_id,
    purchase_id,
    session_number,
    appointment_id,
  };

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("evolutions")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Não foi possível registrar evolução." };
  }

  revalidatePath(`/pacientes/${clientId}`, "layout");
  return { ok: true, id: data.id };
}

export async function uploadEvolutionPhoto(
  clientId: string,
  evolutionId: string,
  formData: FormData,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const cid = uuidSchema.safeParse(clientId);
  const eid = uuidSchema.safeParse(evolutionId);
  if (!cid.success || !eid.success) {
    return { ok: false, error: "Identificadores inválidos." };
  }

  const { data: evo } = await ctx.supabase
    .schema("clinic")
    .from("evolutions")
    .select("id, client_id")
    .eq("id", eid.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!evo || evo.client_id !== cid.data) {
    return { ok: false, error: "Evolução não encontrada." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione uma imagem." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Imagem muito grande (máx. 12 MB)." };
  }
  const mimeErr = assertPhotoMime(file.type);
  if (mimeErr) return { ok: false, error: mimeErr };

  const captionRaw = formData.get("caption");
  const caption =
    typeof captionRaw === "string" && captionRaw.trim() !== ""
      ? captionRaw.trim().slice(0, 500)
      : null;

  const path = buildClinicalStoragePath({
    tenantId: ctx.tenantId,
    clientId: cid.data,
    category: "photos",
    originalFileName: file.name,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (upErr) {
    return { ok: false, error: upErr.message ?? "Falha no upload." };
  }

  const { data: row, error: dbErr } = await ctx.supabase
    .schema("clinic")
    .from("photos")
    .insert({
      tenant_id: ctx.tenantId,
      client_id: cid.data,
      storage_key: path,
      caption,
      taken_at: new Date().toISOString().slice(0, 10),
      evolution_id: eid.data,
    })
    .select("id")
    .single();

  if (dbErr || !row) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
    return { ok: false, error: dbErr?.message ?? "Erro ao registrar foto." };
  }

  revalidatePath(`/pacientes/${cid.data}`, "layout");
  return { ok: true, id: row.id };
}

export async function deleteEvolution(
  clientId: string,
  evolutionId: string,
): Promise<{ ok: true } | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const cid = uuidSchema.safeParse(clientId);
  const eid = uuidSchema.safeParse(evolutionId);
  if (!cid.success || !eid.success) {
    return { ok: false, error: "Identificadores inválidos." };
  }

  // Soltar vínculo em photos antes de apagar evolução
  await ctx.supabase
    .schema("clinic")
    .from("photos")
    .update({ evolution_id: null })
    .eq("evolution_id", eid.data)
    .eq("tenant_id", ctx.tenantId);

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("evolutions")
    .delete()
    .eq("id", eid.data)
    .eq("client_id", cid.data)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Falha ao excluir." };
  }

  revalidatePath(`/pacientes/${cid.data}`, "layout");
  return { ok: true };
}
