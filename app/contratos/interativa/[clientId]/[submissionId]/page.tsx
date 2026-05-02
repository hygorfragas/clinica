import { notFound, redirect } from "next/navigation";
import { InteractiveAnamnesisEditor } from "@/components/anamnesis/interactive-anamnesis-editor";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";
import {
  anamnesisStrokesSchema,
  type AnamnesisStroke,
} from "@/lib/anamnesis/template-schema";
import { createServiceRoleClient } from "@/lib/supabase/service";

type PageProps = {
  params: Promise<{ clientId: string; submissionId: string }>;
};

export default async function ContratoInterativoPage({ params }: PageProps) {
  const { clientId, submissionId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const { data: submission } = await ctx.supabase
    .schema("clinic")
    .from("contract_submissions")
    .select(
      "id, template_id, mode, status, ink_strokes, signer_name, client_id",
    )
    .eq("id", submissionId)
    .eq("tenant_id", ctx.tenantId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!submission) notFound();

  if (submission.status !== "draft") {
    redirect(`/pacientes/${clientId}/contratos`);
  }

  let templatePdfUrl: string | null = null;
  let templateLabel: string | null = null;
  if (submission.template_id) {
    const { data: template } = await ctx.supabase
      .schema("clinic")
      .from("contract_templates")
      .select("id, title, storage_key, mime_type")
      .eq("id", submission.template_id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (template?.storage_key && template.mime_type === "application/pdf") {
      const storageClient = createServiceRoleClient();
      const { data: signed, error: signErr } = await storageClient.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(template.storage_key, 60 * 60);
      if (signErr) {
        console.error(
          "[contratos.interativa] Falha ao gerar signed URL:",
          signErr.message,
        );
      }
      templatePdfUrl = signed?.signedUrl ?? null;
    }
    templateLabel = template?.title ?? null;
  }

  const parsedStrokes = anamnesisStrokesSchema.safeParse(
    submission.ink_strokes ?? [],
  );
  const strokes: AnamnesisStroke[] = parsedStrokes.success
    ? parsedStrokes.data
    : [];

  return (
    <InteractiveAnamnesisEditor
      clientId={clientId}
      submissionId={submissionId}
      templateId={submission.template_id}
      templatePdfUrl={templatePdfUrl}
      initialStrokes={strokes}
      initialSignerName={submission.signer_name}
      initialStatus={submission.status as "draft" | "submitted" | "signed"}
      patientLabel={ctx.client.full_name}
      templateLabel={templateLabel ?? undefined}
      entityKind="contract"
    />
  );
}
