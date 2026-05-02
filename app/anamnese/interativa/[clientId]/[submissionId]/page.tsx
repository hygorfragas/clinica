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

export default async function AnamneseInterativaPage({ params }: PageProps) {
  const { clientId, submissionId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const { data: submission } = await ctx.supabase
    .schema("clinic")
    .from("anamnesis_submissions")
    .select(
      "id, template_id, mode, status, ink_strokes, signer_name, client_id",
    )
    .eq("id", submissionId)
    .eq("tenant_id", ctx.tenantId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!submission) notFound();

  // Se já finalizada, redireciona para a lista.
  if (submission.status !== "draft") {
    redirect(`/pacientes/${clientId}/anamnese`);
  }

  let templatePdfUrl: string | null = null;
  let templateLabel: string | null = null;
  if (submission.template_id) {
    const { data: template } = await ctx.supabase
      .schema("clinic")
      .from("anamnesis_templates")
      .select("id, name, pdf_storage_path")
      .eq("id", submission.template_id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (template?.pdf_storage_path) {
      const storageClient = createServiceRoleClient();
      const { data: signed, error: signErr } = await storageClient.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(template.pdf_storage_path, 60 * 60);
      if (signErr) {
        console.error(
          "[anamnese.interativa] Falha ao gerar signed URL:",
          signErr.message,
        );
      }
      templatePdfUrl = signed?.signedUrl ?? null;
    }
    templateLabel = template?.name ?? null;
  }

  const parsedStrokes = anamnesisStrokesSchema.safeParse(
    submission.ink_strokes ?? [],
  );
  const strokes: AnamnesisStroke[] = parsedStrokes.success ? parsedStrokes.data : [];

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
    />
  );
}
