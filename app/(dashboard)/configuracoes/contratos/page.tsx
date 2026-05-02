import {
  ContractTemplatesManager,
  type ContractTemplateListItem,
} from "@/components/configuracoes/contract-templates-manager";
import { requireClinicAdminPage } from "@/lib/auth/page-guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ConfiguracoesContratosPage() {
  const profile = await requireClinicAdminPage();
  const supabase = await createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .schema("clinic")
    .from("contract_templates")
    .select("id, title, body_html, storage_key, mime_type, is_default, created_at")
    .eq("tenant_id", profile.tenant_id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Modelos de contrato
          </h1>
        </header>
        <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger ring-1 ring-danger/20">
          Não foi possível carregar os modelos. Confira se a migração{" "}
          <code className="rounded bg-muted px-1 text-xs">20260407180000_contract_templates_and_document_body</code>{" "}
          foi aplicada no Supabase.
        </p>
        <p className="text-xs text-ink-muted">{error.message}</p>
      </div>
    );
  }

  const initialTemplates: ContractTemplateListItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body_html: r.body_html,
    storage_key: r.storage_key,
    mime_type: r.mime_type,
    is_default: r.is_default,
    created_at: r.created_at,
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Modelos de contrato
        </h1>
      </header>
      <ContractTemplatesManager initialTemplates={initialTemplates} />
    </div>
  );
}
