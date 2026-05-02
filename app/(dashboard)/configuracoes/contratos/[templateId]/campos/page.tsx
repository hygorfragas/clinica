import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateFieldDesigner } from "@/components/anamnesis/template-field-designer";
import {
  anamnesisFieldsSchema,
  type AnamnesisField,
} from "@/lib/anamnesis/template-schema";
import { requireClinicAdminPage } from "@/lib/auth/page-guards";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ templateId: string }> };

export default async function EditContractTemplateFieldsPage({
  params,
}: PageProps) {
  const { templateId } = await params;
  const profile = await requireClinicAdminPage();
  const supabase = await createServerSupabaseClient();

  const { data: template } = await supabase
    .schema("clinic")
    .from("contract_templates")
    .select("id, title, mime_type, storage_key, form_schema")
    .eq("id", templateId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (!template) notFound();

  if (template.mime_type !== "application/pdf" || !template.storage_key) {
    return (
      <div className="space-y-4">
        <Link
          href="/configuracoes/contratos"
          className="text-xs font-medium text-ink-muted hover:text-ink"
        >
          ← Voltar para contratos
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          {template.title}
        </h1>
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Só é possível marcar campos em modelos baseados em <strong>PDF</strong>.
          Modelos de texto formatado usam placeholders{" "}
          <code className="rounded bg-amber-100/70 px-1">
            {"{{client.full_name}}"}
          </code>{" "}
          no editor; modelos em imagem ainda não têm suporte a marcação visual.
        </p>
      </div>
    );
  }

  const parsed = anamnesisFieldsSchema.safeParse(template.form_schema ?? []);
  const fields: AnamnesisField[] = parsed.success ? parsed.data : [];

  const { data: signed } = await supabase.storage
    .from(CLINICAL_BUCKET)
    .createSignedUrl(template.storage_key, 60 * 30);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/configuracoes/contratos"
          className="text-xs font-medium text-ink-muted hover:text-ink"
        >
          ← Voltar para contratos
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          {template.title}
        </h1>
        <p className="text-sm text-ink-muted">
          Marque os campos de assinatura, rubrica, texto e dados que a paciente
          precisa preencher. O fluxo de assinatura é o mesmo da anamnese.
        </p>
      </header>

      {signed?.signedUrl ? (
        <TemplateFieldDesigner
          entityKind="contract"
          templateId={template.id}
          templateName={template.title}
          pdfUrl={signed.signedUrl}
          initialFields={fields}
        />
      ) : (
        <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger ring-1 ring-danger/20">
          Não foi possível obter a URL assinada do PDF do contrato.
        </p>
      )}
    </div>
  );
}
