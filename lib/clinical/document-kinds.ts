/** Valores de `clinic.documents.kind` usados na UI. */
export const DOCUMENT_KINDS = {
  procedure: "procedure",
  contract: "contract",
  other: "other",
} as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[keyof typeof DOCUMENT_KINDS];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  procedure: "Procedimento (termos / orientações)",
  contract: "Contrato",
  other: "Outro",
};

export const DOCUMENT_KIND_OPTIONS: { value: DocumentKind; label: string }[] = [
  { value: DOCUMENT_KINDS.procedure, label: DOCUMENT_KIND_LABELS.procedure },
  { value: DOCUMENT_KINDS.contract, label: DOCUMENT_KIND_LABELS.contract },
  { value: DOCUMENT_KINDS.other, label: DOCUMENT_KIND_LABELS.other },
];

/**
 * Kinds gerados pelo sistema (não aparecem em DOCUMENT_KIND_OPTIONS).
 * Úteis para filtrar listagens específicas (ex.: histórico exportado).
 */
export const SYSTEM_DOCUMENT_KINDS = {
  clientHistoryExport: "client_history_export",
} as const;

export type SystemDocumentKind =
  (typeof SYSTEM_DOCUMENT_KINDS)[keyof typeof SYSTEM_DOCUMENT_KINDS];
