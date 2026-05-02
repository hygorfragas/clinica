import { notFound } from "next/navigation";
import Link from "next/link";
import { AnamnesisSubmissionsPanel } from "@/components/anamnesis/anamnesis-submissions-panel";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";
import {
  anamnesisFieldsSchema,
  anamnesisFormValuesSchema,
  anamnesisStrokesSchema,
  type AnamnesisField,
  type AnamnesisFormValues,
  type AnamnesisStroke,
  type AnamnesisSubmissionMode,
  type AnamnesisSubmissionStatus,
} from "@/lib/anamnesis/template-schema";
import { createServiceRoleClient } from "@/lib/supabase/service";

type PageProps = { params: Promise<{ clientId: string }> };

type TemplateLite = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  page_count: number;
  pdf_url: string | null;
  form_schema: AnamnesisField[];
};

type SubmissionListItem = {
  id: string;
  template_id: string | null;
  template_name: string | null;
  mode: AnamnesisSubmissionMode;
  status: AnamnesisSubmissionStatus;
  updated_at: string;
  signer_name: string | null;
  submitted_at: string | null;
  signed_at: string | null;
  flattened_pdf_url: string | null;
  form_values: AnamnesisFormValues;
  ink_strokes: AnamnesisStroke[];
};

export default async function PacienteContratosPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const storageClient = createServiceRoleClient();

  // Só contratos PDF com form_schema rastreado entram nesse pipeline.
  const [{ data: templatesRows }, { data: submissionRows }] = await Promise.all(
    [
      ctx.supabase
        .schema("clinic")
        .from("contract_templates")
        .select(
          "id, title, storage_key, mime_type, page_count, form_schema, is_default",
        )
        .eq("tenant_id", ctx.tenantId)
        .eq("mime_type", "application/pdf")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }),
      ctx.supabase
        .schema("clinic")
        .from("contract_submissions")
        .select(
          "id, template_id, mode, status, updated_at, signer_name, submitted_at, signed_at, flattened_pdf_path, form_values, ink_strokes",
        )
        .eq("tenant_id", ctx.tenantId)
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false }),
    ],
  );

  const templateMap = new Map<string, string>();
  const templates: TemplateLite[] = [];
  for (const row of templatesRows ?? []) {
    if (!row.storage_key) continue;
    templateMap.set(row.id, row.title);
    let signedUrl: string | null = null;
    const { data: s, error: signErr } = await storageClient.storage
      .from(CLINICAL_BUCKET)
      .createSignedUrl(row.storage_key, 60 * 30);
    if (signErr) {
      console.error(
        "[contratos] Falha ao gerar signed URL do contrato:",
        row.id,
        signErr.message,
      );
    }
    signedUrl = s?.signedUrl ?? null;
    const parsedFields = anamnesisFieldsSchema.safeParse(row.form_schema ?? []);
    templates.push({
      id: row.id,
      name: row.title,
      description: null,
      is_default: row.is_default,
      page_count: row.page_count ?? 1,
      pdf_url: signedUrl,
      form_schema: parsedFields.success ? parsedFields.data : [],
    });
  }

  const submissions: SubmissionListItem[] = [];
  for (const s of submissionRows ?? []) {
    let flattenedUrl: string | null = null;
    if (s.flattened_pdf_path) {
      const { data: signed, error: signErr } = await storageClient.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(s.flattened_pdf_path, 60 * 30);
      if (signErr) {
        console.error(
          "[contratos] Falha ao gerar signed URL do contrato assinado:",
          s.id,
          signErr.message,
        );
      }
      flattenedUrl = signed?.signedUrl ?? null;
    }
    const parsedValues = anamnesisFormValuesSchema.safeParse(
      s.form_values ?? {},
    );
    const parsedStrokes = anamnesisStrokesSchema.safeParse(s.ink_strokes ?? []);
    submissions.push({
      id: s.id,
      template_id: s.template_id,
      template_name: s.template_id
        ? templateMap.get(s.template_id) ?? null
        : null,
      mode: s.mode,
      status: s.status,
      updated_at: s.updated_at,
      signer_name: s.signer_name,
      submitted_at: s.submitted_at,
      signed_at: s.signed_at,
      flattened_pdf_url: flattenedUrl,
      form_values: parsedValues.success ? parsedValues.data : {},
      ink_strokes: parsedStrokes.success ? parsedStrokes.data : [],
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">Contratos</h2>
          <p className="text-sm text-ink-muted">
            Cada contrato é preenchido sobre um modelo PDF com campos
            rastreados. Modo desktop ou tablet — assinatura e preenchimento
            seguem o mesmo fluxo de Anamnese e Evolução.
          </p>
        </div>
        {templates.length === 0 && (
          <Link
            href="/configuracoes/contratos"
            className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"
          >
            Cadastrar contrato
          </Link>
        )}
      </header>

      <AnamnesisSubmissionsPanel
        clientId={clientId}
        templates={templates}
        submissions={submissions}
        entityKind="contract"
      />
    </div>
  );
}
