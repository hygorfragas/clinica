"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import {
  anamnesisPayloadSchema,
  parseAnamnesisPayload,
} from "@/lib/anamnesis/schema";
import { DOCUMENT_KINDS } from "@/lib/clinical/document-kinds";
import {
  BODY_REGIONS,
  isBodyRegion,
  isFaceBonecoAngle,
  MAX_PHOTOS_PER_BATCH,
  type BodyRegion,
} from "@/lib/clinical/body-regions";
import {
  assertDocumentMime,
  assertPhotoMime,
  assertSignatureMime,
  buildClinicalStoragePath,
  CLINICAL_BUCKET,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  MAX_SIGNATURE_BYTES,
  tenantPrefixFromStorageKey,
} from "@/lib/clinical/storage";
import { updatePatientSchema } from "@/lib/clients/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type ClinicClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type ActionError = { ok: false; error: string };
type ActionOk = { ok: true };

async function requireClinicalContext(): Promise<
  | { ok: true; supabase: ClinicClient; tenantId: string }
  | ActionError
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id || !canAccessAgenda(profile)) {
    return { ok: false, error: "Sem permissão para esta ação." };
  }
  return { ok: true, supabase, tenantId: profile.tenant_id };
}

async function assertClientInTenant(
  supabase: ClinicClient,
  tenantId: string,
  clientId: string,
): Promise<boolean> {
  const { data } = await supabase
    .schema("clinic")
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return !!data;
}

function revalidatePaciente(clientId: string) {
  revalidatePath(`/pacientes/${clientId}`, "layout");
  revalidatePath("/pacientes");
}

export async function updatePatient(
  clientId: string,
  raw: unknown,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const parsed = updatePatientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  if (Object.keys(parsed.data).length === 0) {
    return { ok: false, error: "Nada para atualizar." };
  }

  const belongs = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    clientId,
  );
  if (!belongs) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("clients")
    .update(parsed.data)
    .eq("id", clientId)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Erro ao atualizar." };
  }

  revalidatePaciente(clientId);
  return { ok: true };
}

export async function saveAnamnesis(
  clientId: string,
  raw: unknown,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const belongs = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    clientId,
  );
  if (!belongs) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  const { data: latest } = await ctx.supabase
    .schema("clinic")
    .from("anamnesis_forms")
    .select("id, payload")
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previous = parseAnamnesisPayload(latest?.payload);
  const merged = { ...previous, ...(raw as Record<string, unknown>) };
  const parsed = anamnesisPayloadSchema.safeParse(merged);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Anamnese inválida",
    };
  }

  if (latest?.id) {
    const { error } = await ctx.supabase
      .schema("clinic")
      .from("anamnesis_forms")
      .update({
        payload: parsed.data as Json,
        schema_version: 1,
      })
      .eq("id", latest.id)
      .eq("tenant_id", ctx.tenantId);

    if (error) {
      return { ok: false, error: error.message ?? "Erro ao salvar anamnese." };
    }
  } else {
    const { error } = await ctx.supabase.schema("clinic").from("anamnesis_forms").insert({
      tenant_id: ctx.tenantId,
      client_id: clientId,
      payload: parsed.data as Json,
      schema_version: 1,
    });

    if (error) {
      return { ok: false, error: error.message ?? "Erro ao salvar anamnese." };
    }
  }

  revalidatePaciente(clientId);
  return { ok: true };
}

const evolutionBodySchema = z
  .string()
  .trim()
  .min(1, "Escreva a evolução")
  .max(20000, "Texto muito longo");

export async function addEvolution(
  clientId: string,
  bodyRaw: unknown,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const bodyParsed = evolutionBodySchema.safeParse(bodyRaw);
  if (!bodyParsed.success) {
    return { ok: false, error: bodyParsed.error.errors[0]?.message ?? "Texto inválido" };
  }

  const belongs = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    clientId,
  );
  if (!belongs) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  const { error } = await ctx.supabase.schema("clinic").from("evolutions").insert({
    tenant_id: ctx.tenantId,
    client_id: clientId,
    body: bodyParsed.data,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Erro ao registrar evolução." };
  }

  revalidatePaciente(clientId);
  return { ok: true };
}

async function verifyStorageKeyForTenant(
  supabase: ClinicClient,
  tenantId: string,
  key: string,
): Promise<boolean> {
  const prefix = tenantPrefixFromStorageKey(key);
  if (prefix !== tenantId) return false;

  const [{ data: p }, { data: d }, { data: s }] = await Promise.all([
    supabase
      .schema("clinic")
      .from("photos")
      .select("id")
      .eq("storage_key", key)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .schema("clinic")
      .from("documents")
      .select("id")
      .eq("storage_key", key)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .schema("clinic")
      .from("signatures")
      .select("id")
      .eq("image_storage_key", key)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  return !!(p || d || s);
}

export async function getClinicalSignedUrl(
  storageKey: string,
): Promise<{ ok: true; url: string } | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const allowed = await verifyStorageKeyForTenant(
    ctx.supabase,
    ctx.tenantId,
    storageKey,
  );
  if (!allowed) {
    return { ok: false, error: "Arquivo não encontrado." };
  }

  const { data, error } = await ctx.supabase.storage
    .from(CLINICAL_BUCKET)
    .createSignedUrl(storageKey, 3600);

  if (error || !data?.signedUrl) {
    return { ok: false, error: "Não foi possível abrir o arquivo." };
  }

  return { ok: true, url: data.signedUrl };
}

export async function uploadClinicalPhoto(
  clientId: string,
  formData: FormData,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const belongs = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    clientId,
  );
  if (!belongs) {
    return { ok: false, error: "Paciente não encontrada." };
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

  const takenRaw = formData.get("taken_at");
  let taken_at: string | null = null;
  if (typeof takenRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(takenRaw)) {
    taken_at = takenRaw;
  }

  const brRaw = formData.get("body_region");
  const body_region: BodyRegion =
    typeof brRaw === "string" && isBodyRegion(brRaw) ? brRaw : BODY_REGIONS.other;

  const caRaw = formData.get("capture_angle");
  let capture_angle: string | null = null;
  if (body_region === BODY_REGIONS.face) {
    if (
      typeof caRaw === "string" &&
      (isFaceBonecoAngle(caRaw) || caRaw === "custom")
    ) {
      capture_angle = caRaw;
    }
  }

  const path = buildClinicalStoragePath({
    tenantId: ctx.tenantId,
    clientId,
    category: "photos",
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
    return {
      ok: false,
      error:
        upErr.message ??
        "Falha no upload. Confira se o bucket clinical existe e as políticas de Storage foram aplicadas.",
    };
  }

  const { error: dbErr } = await ctx.supabase.schema("clinic").from("photos").insert({
    tenant_id: ctx.tenantId,
    client_id: clientId,
    storage_key: path,
    caption,
    taken_at,
    body_region,
    capture_angle,
  });

  if (dbErr) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
    return { ok: false, error: dbErr.message ?? "Erro ao registrar foto." };
  }

  revalidatePaciente(clientId);
  return { ok: true };
}

type BatchPhotoMeta = {
  angle: string | null;
  caption?: string | null;
  taken_at?: string | null;
};

export async function uploadClinicalPhotosBatch(
  clientId: string,
  formData: FormData,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const belongs = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    clientId,
  );
  if (!belongs) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  const brRaw = formData.get("body_region");
  if (typeof brRaw !== "string" || !isBodyRegion(brRaw)) {
    return { ok: false, error: "Selecione a região do procedimento." };
  }
  const body_region = brRaw;

  const metaRaw = formData.get("meta");
  if (typeof metaRaw !== "string") {
    return { ok: false, error: "Metadados do envio ausentes." };
  }

  let meta: BatchPhotoMeta[];
  try {
    meta = JSON.parse(metaRaw) as BatchPhotoMeta[];
  } catch {
    return { ok: false, error: "Metadados inválidos." };
  }

  const files = formData
    .getAll("files")
    .filter((x): x is File => x instanceof File && x.size > 0);

  if (files.length === 0) {
    return { ok: false, error: "Selecione ao menos uma imagem." };
  }
  if (files.length > MAX_PHOTOS_PER_BATCH) {
    return {
      ok: false,
      error: `Máximo de ${MAX_PHOTOS_PER_BATCH} fotos por envio.`,
    };
  }
  if (meta.length !== files.length) {
    return {
      ok: false,
      error: "Cada arquivo precisa de legenda/ângulo correspondente nos metadados.",
    };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const item = meta[i];
    if (!item) {
      return { ok: false, error: "Metadados incompletos." };
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return {
        ok: false,
        error: `A foto ${i + 1} excede o tamanho máximo (12 MB).`,
      };
    }
    const mimeErr = assertPhotoMime(file.type);
    if (mimeErr) return { ok: false, error: mimeErr };

    let capture_angle: string | null = null;
    if (body_region === BODY_REGIONS.face) {
      const a = item.angle;
      if (
        typeof a !== "string" ||
        (!isFaceBonecoAngle(a) && a !== "custom")
      ) {
        return {
          ok: false,
          error: `Foto ${i + 1}: selecione o ângulo de captura (obrigatório para rosto).`,
        };
      }
      capture_angle = a;
    }

    let taken_at: string | null = null;
    const t = item.taken_at;
    if (typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t)) {
      taken_at = t;
    }

    const cap =
      typeof item.caption === "string" && item.caption.trim() !== ""
        ? item.caption.trim().slice(0, 500)
        : null;

    const path = buildClinicalStoragePath({
      tenantId: ctx.tenantId,
      clientId,
      category: "photos",
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
      return {
        ok: false,
        error:
          upErr.message ??
          "Falha no upload. Confira o bucket clinical e as políticas de Storage.",
      };
    }

    const { error: dbErr } = await ctx.supabase
      .schema("clinic")
      .from("photos")
      .insert({
        tenant_id: ctx.tenantId,
        client_id: clientId,
        storage_key: path,
        caption: cap,
        taken_at,
        body_region,
        capture_angle,
      });

    if (dbErr) {
      await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
      return {
        ok: false,
        error: dbErr.message ?? `Erro ao registrar a foto ${i + 1}.`,
      };
    }
  }

  revalidatePaciente(clientId);
  return { ok: true };
}

const documentKindSchema = z.enum([
  DOCUMENT_KINDS.procedure,
  DOCUMENT_KINDS.contract,
  DOCUMENT_KINDS.other,
]);

export async function uploadClinicalDocument(
  clientId: string,
  formData: FormData,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const belongs = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    clientId,
  );
  if (!belongs) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx. 20 MB)." };
  }
  const mimeErr = assertDocumentMime(file.type);
  if (mimeErr) return { ok: false, error: mimeErr };

  const kindRaw = formData.get("kind");
  const kindParsed = documentKindSchema.safeParse(kindRaw);
  if (!kindParsed.success) {
    return { ok: false, error: "Tipo de documento inválido." };
  }
  const kind = kindParsed.data;

  const titleRaw = formData.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim() !== ""
      ? titleRaw.trim().slice(0, 500)
      : null;

  const path = buildClinicalStoragePath({
    tenantId: ctx.tenantId,
    clientId,
    category: "documents",
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
    return {
      ok: false,
      error: upErr.message ?? "Falha no upload do documento.",
    };
  }

  const { error: dbErr } = await ctx.supabase
    .schema("clinic")
    .from("documents")
    .insert({
      tenant_id: ctx.tenantId,
      client_id: clientId,
      kind,
      title,
      storage_key: path,
      mime_type: file.type,
    });

  if (dbErr) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
    return { ok: false, error: dbErr.message ?? "Erro ao registrar documento." };
  }

  revalidatePaciente(clientId);
  return { ok: true };
}

const signerNameSchema = z.string().trim().min(2, "Informe o nome de quem assinou").max(200);

export async function registerSignature(
  clientId: string,
  formData: FormData,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const belongs = await assertClientInTenant(
    ctx.supabase,
    ctx.tenantId,
    clientId,
  );
  if (!belongs) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  const documentIdRaw = formData.get("document_id");
  let document_id: string | null = null;
  if (typeof documentIdRaw === "string" && documentIdRaw.length > 0) {
    const { data: doc } = await ctx.supabase
      .schema("clinic")
      .from("documents")
      .select("id")
      .eq("id", documentIdRaw)
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (!doc) {
      return { ok: false, error: "Documento inválido para esta paciente." };
    }
    document_id = doc.id;
  }

  const nameParsed = signerNameSchema.safeParse(formData.get("signer_name"));
  if (!nameParsed.success) {
    return { ok: false, error: nameParsed.error.errors[0]?.message ?? "Nome inválido" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Anexe a imagem da assinatura." };
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    return { ok: false, error: "Imagem da assinatura muito grande (máx. 5 MB)." };
  }
  const mimeErr = assertSignatureMime(file.type);
  if (mimeErr) return { ok: false, error: mimeErr };

  const path = buildClinicalStoragePath({
    tenantId: ctx.tenantId,
    clientId,
    category: "signatures",
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
    return { ok: false, error: upErr.message ?? "Falha no upload da assinatura." };
  }

  const { error: dbErr } = await ctx.supabase.schema("clinic").from("signatures").insert({
    tenant_id: ctx.tenantId,
    client_id: clientId,
    document_id,
    image_storage_key: path,
    signer_name: nameParsed.data,
    client_metadata: {},
  });

  if (dbErr) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([path]);
    return { ok: false, error: dbErr.message ?? "Erro ao registrar assinatura." };
  }

  revalidatePaciente(clientId);
  return { ok: true };
}

export async function deleteClinicalPhoto(
  clientId: string,
  photoId: string,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const { data: row } = await ctx.supabase
    .schema("clinic")
    .from("photos")
    .select("storage_key")
    .eq("id", photoId)
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Foto não encontrada." };
  }

  await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([row.storage_key]);
  await ctx.supabase
    .schema("clinic")
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("tenant_id", ctx.tenantId);

  revalidatePaciente(clientId);
  return { ok: true };
}

export async function deleteClinicalDocument(
  clientId: string,
  documentId: string,
): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const { data: row } = await ctx.supabase
    .schema("clinic")
    .from("documents")
    .select("storage_key")
    .eq("id", documentId)
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Documento não encontrado." };
  }

  await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([row.storage_key]);
  await ctx.supabase
    .schema("clinic")
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("tenant_id", ctx.tenantId);

  revalidatePaciente(clientId);
  return { ok: true };
}
