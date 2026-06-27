"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import {
  applyClientContractPlaceholders,
  applyProfessionalContractPlaceholders,
} from "@/lib/contracts/html-contract-merge";
import { requireClinicalTenantContext } from "@/lib/clients/clinical-tenant-context";
import { updatePatientSchema } from "@/lib/clients/schemas";
import {
  fetchClinicProfile,
  isTenantManager,
} from "@/lib/auth/clinic-profile";
import type { Json } from "@/lib/supabase/database.types";
import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";

type ActionError = { ok: false; error: string };
type ActionOk = { ok: true };

async function requireClinicalContext() {
  return requireClinicalTenantContext();
}

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

/** Marca a paciente como oculta na UI (lista e ficha). O registro permanece no banco. */
export async function hidePatientFromUi(clientId: string): Promise<ActionOk | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const { data: row } = await ctx.supabase
    .schema("clinic")
    .from("clients")
    .select("id, hidden_from_ui_at")
    .eq("id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Paciente não encontrada." };
  }

  if (row.hidden_from_ui_at) {
    return { ok: true };
  }

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("clients")
    .update({ hidden_from_ui_at: new Date().toISOString() })
    .eq("id", clientId)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Não foi possível ocultar a paciente." };
  }

  revalidatePaciente(clientId);
  revalidatePath("/inicio");
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

async function storageKeyReferencedInClinicalTables(
  supabase: ClinicSupabaseClient,
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

/** Arquivos em {tenant}/profiles/{profileId}/… só para o próprio perfil ou gestor do tenant. */
async function verifyProfileAssetStorageAccess(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  userId: string,
  key: string,
): Promise<boolean> {
  const prefix = tenantPrefixFromStorageKey(key);
  if (prefix !== tenantId) return false;
  const parts = key.split("/").filter(Boolean);
  if (parts.length < 4 || parts[1] !== "profiles") return false;
  const profileId = parts[2];
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) return false;

  if (profileId === userId) return true;

  const me = await fetchClinicProfile(supabase, userId);
  if (me && isTenantManager(me) && me.tenant_id === tenantId) {
    const { data } = await supabase
      .schema("clinic")
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    return !!data;
  }
  return false;
}

async function verifyClinicalStorageKeyAccess(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  userId: string,
  key: string,
): Promise<boolean> {
  if (await storageKeyReferencedInClinicalTables(supabase, tenantId, key)) {
    return true;
  }
  return verifyProfileAssetStorageAccess(supabase, tenantId, userId, key);
}

export async function getClinicalSignedUrl(
  storageKey: string,
): Promise<{ ok: true; url: string } | ActionError> {
  const ctx = await requireClinicalContext();
  if (!ctx.ok) return ctx;

  const allowed = await verifyClinicalStorageKeyAccess(
    ctx.supabase,
    ctx.tenantId,
    ctx.userId,
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
  if (!(file instanceof Blob) || file.size === 0) {
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
    originalFileName: (file as File).name ?? "arquivo",
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
  /** Vínculo a compra: antes ou depois do procedimento. */
  comparison_role?: "before" | "after" | null;
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

  const purchaseIdRaw = formData.get("purchase_id");
  let purchase_id: string | null = null;
  if (
    typeof purchaseIdRaw === "string" &&
    purchaseIdRaw.length > 0
  ) {
    const uid = z.string().uuid().safeParse(purchaseIdRaw);
    if (!uid.success) {
      return { ok: false, error: "Identificador de procedimento inválido." };
    }
    const { data: pur } = await ctx.supabase
      .schema("clinic")
      .from("client_procedure_purchases")
      .select("id")
      .eq("id", uid.data)
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (!pur) {
      return { ok: false, error: "Procedimento/compra não encontrado para esta paciente." };
    }
    purchase_id = uid.data;
  }

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
    .filter((x): x is File => x instanceof Blob && x.size > 0);

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

    let comparison_role: string | null = null;
    const cr = item.comparison_role;
    if (cr === "before" || cr === "after") {
      comparison_role = cr;
    }
    if (comparison_role && !purchase_id) {
      return {
        ok: false,
        error:
          "Para marcar foto como antes ou depois, selecione o procedimento/compra correspondente.",
      };
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
        purchase_id,
        comparison_role,
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

type EvolutionPhotoMeta = {
  caption?: string | null;
  comparison_role?: "before" | "after" | null;
  /** Região do corpo (opcional; default "face"). */
  body_region?: BodyRegion | null;
};

/**
 * Upload de fotos clínicas vinculadas a uma submissão de evolução.
 *
 * Diferenças vs. uploadClinicalPhotosBatch:
 * - aceita comparison_role (Antes/Depois) sem exigir purchase_id, já que aqui o
 *   contexto é a sessão de evolução em si;
 * - grava evolution_submission_id pra agrupar fotos da ficha no PDF/painel.
 */
export async function uploadEvolutionSubmissionPhotos(
  clientId: string,
  submissionId: string,
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

  const submissionParsed = z.string().uuid().safeParse(submissionId);
  if (!submissionParsed.success) {
    return { ok: false, error: "Identificador de evolução inválido." };
  }

  const { data: submission } = await ctx.supabase
    .schema("clinic")
    .from("evolution_submissions")
    .select("id")
    .eq("id", submissionParsed.data)
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!submission) {
    return { ok: false, error: "Ficha de evolução não encontrada." };
  }

  const metaRaw = formData.get("meta");
  if (typeof metaRaw !== "string") {
    return { ok: false, error: "Metadados do envio ausentes." };
  }

  let meta: EvolutionPhotoMeta[];
  try {
    meta = JSON.parse(metaRaw) as EvolutionPhotoMeta[];
  } catch {
    return { ok: false, error: "Metadados inválidos." };
  }

  const files = formData
    .getAll("files")
    .filter((x): x is File => x instanceof Blob && x.size > 0);

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
      error: "Cada arquivo precisa de metadados correspondentes.",
    };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const item = meta[i] ?? {};

    if (file.size > MAX_PHOTO_BYTES) {
      return {
        ok: false,
        error: `A foto ${i + 1} excede o tamanho máximo (12 MB).`,
      };
    }
    const mimeErr = assertPhotoMime(file.type);
    if (mimeErr) return { ok: false, error: mimeErr };

    const region: BodyRegion =
      item.body_region && isBodyRegion(item.body_region)
        ? item.body_region
        : BODY_REGIONS.face;

    const cap =
      typeof item.caption === "string" && item.caption.trim() !== ""
        ? item.caption.trim().slice(0, 500)
        : null;

    let comparison_role: string | null = null;
    if (item.comparison_role === "before" || item.comparison_role === "after") {
      comparison_role = item.comparison_role;
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
        body_region: region,
        capture_angle: null,
        purchase_id: null,
        comparison_role,
        evolution_submission_id: submissionParsed.data,
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

type LibraryPhotoMeta = {
  caption?: string | null;
};

/**
 * Upload de fotos pela biblioteca da ficha (sem região/ângulo obrigatórios).
 * Processa arquivos em série no servidor; todos compartilham o mesmo captured_at.
 */
export async function uploadPatientLibraryPhotos(
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

  const capturedRaw = formData.get("captured_at");
  const capturedParsed = z.string().datetime().safeParse(capturedRaw);
  if (!capturedParsed.success) {
    return { ok: false, error: "Informe a data e hora da captura." };
  }
  const captured_at = capturedParsed.data;
  const taken_at = captured_at.slice(0, 10);

  const metaRaw = formData.get("meta");
  let meta: LibraryPhotoMeta[] = [];
  if (typeof metaRaw === "string" && metaRaw.trim() !== "") {
    try {
      meta = JSON.parse(metaRaw) as LibraryPhotoMeta[];
    } catch {
      return { ok: false, error: "Metadados inválidos." };
    }
  }

  const files = formData
    .getAll("files")
    .filter((x): x is File => x instanceof Blob && x.size > 0);

  if (files.length === 0) {
    return { ok: false, error: "Selecione ao menos uma imagem." };
  }
  if (files.length > MAX_PHOTOS_PER_BATCH) {
    return {
      ok: false,
      error: `Máximo de ${MAX_PHOTOS_PER_BATCH} fotos por envio.`,
    };
  }
  if (meta.length > 0 && meta.length !== files.length) {
    return {
      ok: false,
      error: "Cada arquivo precisa de metadados correspondentes.",
    };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const item = meta[i] ?? {};

    if (file.size > MAX_PHOTO_BYTES) {
      return {
        ok: false,
        error: `A foto ${i + 1} excede o tamanho máximo (12 MB).`,
      };
    }
    const mimeErr = assertPhotoMime(file.type);
    if (mimeErr) return { ok: false, error: mimeErr };

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
        captured_at,
        body_region: BODY_REGIONS.other,
        capture_angle: null,
        purchase_id: null,
        comparison_role: null,
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
  if (!(file instanceof Blob) || file.size === 0) {
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
    originalFileName: (file as File).name ?? "arquivo",
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

const templateIdSchema = z.string().uuid("Modelo de contrato inválido.");

/** Anexa à ficha uma cópia do modelo (arquivo copiado no storage ou HTML). */
export async function attachClientDocumentFromTemplate(
  clientId: string,
  templateId: string,
  titleOverride: string | null,
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

  const tid = templateIdSchema.safeParse(templateId);
  if (!tid.success) {
    return { ok: false, error: tid.error.errors[0]?.message ?? "Modelo inválido." };
  }

  const { data: template, error: tErr } = await ctx.supabase
    .schema("clinic")
    .from("contract_templates")
    .select("id, title, body_html, storage_key, mime_type")
    .eq("id", tid.data)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (tErr || !template) {
    return { ok: false, error: "Modelo de contrato não encontrado." };
  }

  const title =
    typeof titleOverride === "string" && titleOverride.trim() !== ""
      ? titleOverride.trim().slice(0, 500)
      : template.title?.trim().slice(0, 500) || null;

  const hasFile =
    typeof template.storage_key === "string" &&
    template.storage_key.trim().length > 0;
  const hasHtml =
    typeof template.body_html === "string" && template.body_html.trim().length > 0;

  if (hasFile) {
    const dest = buildClinicalStoragePath({
      tenantId: ctx.tenantId,
      clientId,
      category: "documents",
      originalFileName: "contrato-modelo",
    });

    const { error: copyErr } = await ctx.supabase.storage
      .from(CLINICAL_BUCKET)
      .copy(template.storage_key!, dest);

    if (copyErr) {
      return {
        ok: false,
        error: copyErr.message ?? "Falha ao copiar o arquivo do modelo.",
      };
    }

    const { error: dbErr } = await ctx.supabase.schema("clinic").from("documents").insert({
      tenant_id: ctx.tenantId,
      client_id: clientId,
      kind: DOCUMENT_KINDS.contract,
      title,
      storage_key: dest,
      mime_type: template.mime_type ?? "application/octet-stream",
      source_template_id: template.id,
      responsible_profile_id: ctx.userId,
    });

    if (dbErr) {
      await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([dest]);
      return { ok: false, error: dbErr.message ?? "Erro ao registrar documento." };
    }
  } else if (hasHtml) {
    const { data: clientRow, error: cErr } = await ctx.supabase
      .schema("clinic")
      .from("clients")
      .select("full_name, email, phone, cpf, address")
      .eq("id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();

    if (cErr || !clientRow) {
      return { ok: false, error: "Não foi possível carregar dados da paciente para o contrato." };
    }

    const { data: profRow } = await ctx.supabase
      .schema("clinic")
      .from("profiles")
      .select(
        "full_name, professional_registration, signature_storage_key, stamp_storage_key",
      )
      .eq("id", ctx.userId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();

    let bodyHtml = template.body_html ?? "";
    bodyHtml = applyClientContractPlaceholders(bodyHtml, {
      full_name: clientRow.full_name,
      email: clientRow.email,
      phone: clientRow.phone,
      cpf: clientRow.cpf,
      address: clientRow.address,
    });
    bodyHtml = await applyProfessionalContractPlaceholders(
      ctx.supabase,
      bodyHtml,
      profRow ?? {
        full_name: null,
        professional_registration: null,
        signature_storage_key: null,
        stamp_storage_key: null,
      },
    );

    const { error: dbErr } = await ctx.supabase.schema("clinic").from("documents").insert({
      tenant_id: ctx.tenantId,
      client_id: clientId,
      kind: DOCUMENT_KINDS.contract,
      title,
      storage_key: null,
      mime_type: "text/html",
      body_html: bodyHtml,
      source_template_id: template.id,
      responsible_profile_id: ctx.userId,
    });

    if (dbErr) {
      return { ok: false, error: dbErr.message ?? "Erro ao registrar contrato." };
    }
  } else {
    return { ok: false, error: "Este modelo está vazio." };
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
  if (!(file instanceof Blob) || file.size === 0) {
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
    originalFileName: (file as File).name ?? "arquivo",
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

  const roleRaw = formData.get("signer_role");
  const roleParsed = z
    .enum(["patient", "professional"])
    .safeParse(typeof roleRaw === "string" ? roleRaw : undefined);
  const signer_role = roleParsed.success ? roleParsed.data : "patient";

  const { error: dbErr } = await ctx.supabase.schema("clinic").from("signatures").insert({
    tenant_id: ctx.tenantId,
    client_id: clientId,
    document_id,
    image_storage_key: path,
    signer_name: nameParsed.data,
    signer_role,
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

  if (row.storage_key) {
    await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([row.storage_key]);
  }
  await ctx.supabase
    .schema("clinic")
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("tenant_id", ctx.tenantId);

  revalidatePaciente(clientId);
  return { ok: true };
}
