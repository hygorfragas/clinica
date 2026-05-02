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
import { createServiceRoleClient } from "@/lib/supabase/service";

type PageProps = { params: Promise<{ templateId: string }> };

export default async function EditEvolutionTemplatePage({ params }: PageProps) {
  const { templateId } = await params;
  const profile = await requireClinicAdminPage();
  const supabase = await createServerSupabaseClient();

  const { data: template } = await supabase
    .schema("clinic")
    .from("evolution_templates")
    .select("id, name, description, pdf_storage_path, form_schema")
    .eq("id", templateId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (!template) notFound();

  const parsed = anamnesisFieldsSchema.safeParse(template.form_schema ?? []);
  const fields: AnamnesisField[] = parsed.success ? parsed.data : [];

  const storageClient = createServiceRoleClient();
  const { data: signed } = await storageClient.storage
    .from(CLINICAL_BUCKET)
    .createSignedUrl(template.pdf_storage_path, 60 * 30);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/configuracoes/evolucao"
          className="text-xs font-medium text-ink-muted hover:text-ink"
        >
          ← Voltar para fichas
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          {template.name}
        </h1>
        {template.description ? (
          <p className="text-sm text-ink-muted">{template.description}</p>
        ) : null}
      </header>

      {signed?.signedUrl ? (
        <TemplateFieldDesigner
          entityKind="evolution"
          templateId={template.id}
          templateName={template.name}
          pdfUrl={signed.signedUrl}
          initialFields={fields}
        />
      ) : (
        <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger ring-1 ring-danger/20">
          Não foi possível obter a URL assinada do PDF da ficha.
        </p>
      )}
    </div>
  );
}
