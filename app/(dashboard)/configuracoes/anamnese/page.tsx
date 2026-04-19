import { redirect } from "next/navigation";
import {
  TemplatesManager,
  type TemplateRow,
} from "@/components/anamnesis/templates-manager";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ConfiguracoesAnamnesePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id || !canAccessAgenda(profile)) {
    redirect("/aguardando-acesso");
  }

  const { data: rows, error } = await supabase
    .schema("clinic")
    .from("anamnesis_templates")
    .select(
      "id, name, description, is_default, is_archived, page_count, form_schema, updated_at",
    )
    .eq("tenant_id", profile.tenant_id)
    .eq("is_archived", false)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Templates de anamnese
          </h1>
        </header>
        <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger ring-1 ring-danger/20">
          Não foi possível carregar os templates. Verifique se as migrações{" "}
          <code className="rounded bg-muted px-1 text-xs">20260418130000_anamnesis_templates_and_submissions</code>{" "}
          e{" "}
          <code className="rounded bg-muted px-1 text-xs">20260418193000_grant_agenda_anamnesis_tables</code>{" "}
          foram aplicadas no Supabase.
        </p>
        <p className="text-xs text-ink-muted">{error.message}</p>
      </div>
    );
  }

  const templates: TemplateRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    is_default: r.is_default,
    is_archived: r.is_archived,
    page_count: r.page_count,
    form_schema_count: Array.isArray(r.form_schema)
      ? (r.form_schema as unknown[]).length
      : 0,
    updated_at: r.updated_at,
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Templates de anamnese
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Envie PDFs de anamneses/consentimentos e configure os campos
          interativos. Nos atendimentos você pode preencher no modo desktop
          (formulário) ou interativo (caneta/tablet com camada de tinta).
        </p>
      </header>
      <TemplatesManager templates={templates} />
    </div>
  );
}
