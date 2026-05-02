import { randomUUID } from "crypto";

const CLINICAL_BUCKET = "clinical";

export { CLINICAL_BUCKET };

const PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const SIGNATURE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;

export function safeStorageFileName(original: string): string {
  const trimmed = original.trim();
  const base =
    trimmed.length > 0
      ? trimmed.replace(/[^a-zA-Z0-9._-]/g, "_")
      : "arquivo";
  return base.slice(0, 180) || "arquivo";
}

export function buildClinicalStoragePath(params: {
  tenantId: string;
  clientId: string;
  category: "photos" | "documents" | "signatures";
  originalFileName: string;
}): string {
  const safe = safeStorageFileName(params.originalFileName);
  return `${params.tenantId}/${params.clientId}/${params.category}/${randomUUID()}-${safe}`;
}

/** Arquivo de modelo de contrato (sem client_id), apenas no tenant. */
export function buildContractTemplateStoragePath(params: {
  tenantId: string;
  originalFileName: string;
}): string {
  const safe = safeStorageFileName(params.originalFileName);
  return `${params.tenantId}/contract-templates/${randomUUID()}-${safe}`;
}

/** Template de anamnese/consentimento (PDF base) — não vinculado a paciente. */
export function buildAnamnesisTemplateStoragePath(params: {
  tenantId: string;
  templateId: string;
  originalFileName: string;
}): string {
  const safe = safeStorageFileName(params.originalFileName);
  return `${params.tenantId}/anamnesis-templates/${params.templateId}-${safe}`;
}

/** PDF achatado final de uma submissão de anamnese por paciente. */
export function buildAnamnesisSubmissionStoragePath(params: {
  tenantId: string;
  clientId: string;
  submissionId: string;
}): string {
  return `${params.tenantId}/${params.clientId}/anamnesis/${params.submissionId}.pdf`;
}

/** PDF original de uma ficha de evolução (template) — caminho no bucket clinical. */
export function buildEvolutionTemplateStoragePath(params: {
  tenantId: string;
  templateId: string;
  originalFileName: string;
}): string {
  const safe = safeStorageFileName(params.originalFileName);
  return `${params.tenantId}/evolution-templates/${params.templateId}-${safe}`;
}

/** PDF achatado final de um registro de evolução por paciente. */
export function buildEvolutionSubmissionStoragePath(params: {
  tenantId: string;
  clientId: string;
  submissionId: string;
}): string {
  return `${params.tenantId}/${params.clientId}/evolution/${params.submissionId}.pdf`;
}

/** PDF achatado final de uma submissão de contrato por paciente. */
export function buildContractSubmissionStoragePath(params: {
  tenantId: string;
  clientId: string;
  submissionId: string;
}): string {
  return `${params.tenantId}/${params.clientId}/contracts/${params.submissionId}.pdf`;
}

/** Assinatura/carimbo da profissional: primeiro segmento = tenant (RLS do bucket clinical). */
export function buildProfileAssetStoragePath(params: {
  tenantId: string;
  profileId: string;
  kind: "signature" | "stamp";
  originalFileName: string;
}): string {
  const safe = safeStorageFileName(params.originalFileName);
  return `${params.tenantId}/profiles/${params.profileId}/${params.kind}-${randomUUID()}-${safe}`;
}

export function assertPhotoMime(mime: string): string | null {
  if (!PHOTO_MIME.has(mime)) {
    return "Use JPG, PNG ou WebP.";
  }
  return null;
}

export function assertDocumentMime(mime: string): string | null {
  if (!DOC_MIME.has(mime)) {
    return "Formato inválido. Use PDF, Office, TXT/CSV, ZIP ou imagem (JPG, PNG, WebP).";
  }
  return null;
}

export function assertSignatureMime(mime: string): string | null {
  if (!SIGNATURE_MIME.has(mime)) {
    return "Assinatura: use JPG, PNG ou WebP.";
  }
  return null;
}

/** Primeiro segmento do path deve ser o UUID do tenant. */
export function tenantPrefixFromStorageKey(key: string): string | null {
  const first = key.split("/")[0]?.trim();
  if (!first || !/^[0-9a-f-]{36}$/i.test(first)) {
    return null;
  }
  return first;
}
