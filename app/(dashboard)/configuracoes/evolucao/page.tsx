import {
  EvolutionTemplatesManager,
  type EvolutionTemplateRow,
} from "@/components/evolutions/evolution-templates-manager";
import { requireClinicAdminPage } from "@/lib/auth/page-guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ConfiguracoesEvolucaoPage() {
  const profile = await requireClinicAdminPage();
  const supabase = await createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .schema("clinic")
    .from("evolution_templates")
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
            Fichas de evolução
          </h1>
        </header>
        <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger ring-1 ring-danger/20">
          Não foi possível carregar as fichas. Verifique se a migração{" "}
          <code className="rounded bg-muted px-1 text-xs">
            20260502120000_evolution_templates_and_submissions
          </code>{" "}
          foi aplicada no Supabase.
        </p>
        <p className="text-xs text-ink-muted">{error.message}</p>
      </div>
    );
  }

  const templates: EvolutionTemplateRow[] = (rows ?? []).map((r) => ({
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
          Fichas de evolução
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Envie PDFs de fichas de evolução e configure os campos interativos.
          No prontuário do paciente, cada novo registro de evolução é
          preenchido sobre uma dessas fichas — modo desktop ou tablet.
        </p>
      </header>
      <EvolutionTemplatesManager templates={templates} />
    </div>
  );
}
