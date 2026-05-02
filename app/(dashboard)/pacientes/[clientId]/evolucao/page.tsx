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

export default async function PacienteEvolucaoPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const storageClient = createServiceRoleClient();

  const [{ data: templatesRows }, { data: submissionRows }] = await Promise.all([
    ctx.supabase
      .schema("clinic")
      .from("evolution_templates")
      .select(
        "id, name, description, pdf_storage_path, page_count, form_schema, is_default",
      )
      .eq("tenant_id", ctx.tenantId)
      .eq("is_archived", false)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false }),
    ctx.supabase
      .schema("clinic")
      .from("evolution_submissions")
      .select(
        "id, template_id, mode, status, updated_at, signer_name, submitted_at, signed_at, flattened_pdf_path, form_values, ink_strokes",
      )
      .eq("tenant_id", ctx.tenantId)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false }),
  ]);

  const templateMap = new Map<string, string>();
  const templates: TemplateLite[] = [];
  for (const row of templatesRows ?? []) {
    templateMap.set(row.id, row.name);
    let signedUrl: string | null = null;
    if (row.pdf_storage_path) {
      const { data: s, error: signErr } = await storageClient.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(row.pdf_storage_path, 60 * 30);
      if (signErr) {
        console.error(
          "[evolucao] Falha ao gerar signed URL da ficha:",
          row.id,
          signErr.message,
        );
      }
      signedUrl = s?.signedUrl ?? null;
    }
    const parsedFields = anamnesisFieldsSchema.safeParse(row.form_schema ?? []);
    templates.push({
      id: row.id,
      name: row.name,
      description: row.description,
      is_default: row.is_default,
      page_count: row.page_count,
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
          "[evolucao] Falha ao gerar signed URL da evolução:",
          s.id,
          signErr.message,
        );
      }
      flattenedUrl = signed?.signedUrl ?? null;
    }
    const parsedValues = anamnesisFormValuesSchema.safeParse(s.form_values ?? {});
    const parsedStrokes = anamnesisStrokesSchema.safeParse(s.ink_strokes ?? []);
    submissions.push({
      id: s.id,
      template_id: s.template_id,
      template_name: s.template_id ? templateMap.get(s.template_id) ?? null : null,
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
          <h2 className="text-xl font-semibold text-ink">
            Evolução clínica
          </h2>
          <p className="text-sm text-ink-muted">
            Cada novo registro é preenchido sobre uma ficha (PDF) escolhida
            pela usuária. A ficha contém todos os campos necessários — sem
            formulário extra.
          </p>
        </div>
        {templates.length === 0 && (
          <Link
            href="/configuracoes/evolucao"
            className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"
          >
            Cadastrar ficha
          </Link>
        )}
      </header>

      <AnamnesisSubmissionsPanel
        clientId={clientId}
        templates={templates}
        submissions={submissions}
        entityKind="evolution"
      />
    </div>
  );
}
