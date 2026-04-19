import {
  ContractTemplatesManager,
  type ContractTemplateListItem,
} from "@/components/configuracoes/contract-templates-manager";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ConfiguracoesContratosPage() {
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
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Centralize os contratos da clínica: redija no editor (formatação próxima à ABNT) ou envie
          PDF/imagem. No cadastro de nova paciente, ao escolher tipo <strong className="text-ink">Contrato</strong>,
          a paciente vê o modelo e você anexa a cópia à ficha com um clique.
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Em HTML, use os placeholders{" "}
          <code className="rounded bg-muted px-1 text-xs">{"{{client.full_name}}"}</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">{"{{client.cpf}}"}</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">{"{{client.phone}}"}</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">{"{{client.address}}"}</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">{"{{professional.signature}}"}</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">{"{{professional.stamp}}"}</code>{" "}
          (carimbo e assinatura cadastrados em Configurações › Profissional).
        </p>
      </header>
      <ContractTemplatesManager initialTemplates={initialTemplates} />
    </div>
  );
}
