import Link from "next/link";
import {
  NovoPacienteWizard,
  type WizardContractTemplate,
} from "@/components/clients/novo-paciente-wizard";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NovoPacientePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile || !canAccessAgenda(profile)) {
    redirect("/aguardando-acesso");
  }

  if (!profile.tenant_id) {
    redirect("/aguardando-acesso");
  }

  const tplRes = await supabase
    .schema("clinic")
    .from("contract_templates")
    .select("id, title, body_html, storage_key, mime_type, is_default")
    .eq("tenant_id", profile.tenant_id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const contractTemplates: WizardContractTemplate[] = tplRes.error
    ? []
    : (tplRes.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        body_html: r.body_html,
        storage_key: r.storage_key,
        mime_type: r.mime_type,
        is_default: r.is_default,
      }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/pacientes"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Voltar para pacientes
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Nova paciente
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Fluxo completo: cadastro, anamnese, foto opcional, documento opcional
            e acesso à ficha. Contratos cadastrados em{" "}
            <Link href="/configuracoes/contratos" className="font-medium text-brand hover:underline">
              Configurações → Contratos
            </Link>{" "}
            aparecem aqui quando o tipo for Contrato.
          </p>
        </div>
      </div>

      <NovoPacienteWizard contractTemplates={contractTemplates} />
    </div>
  );
}
