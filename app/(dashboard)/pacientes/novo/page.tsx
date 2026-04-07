import Link from "next/link";
import { NovoPacienteWizard } from "@/components/clients/novo-paciente-wizard";
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
            e acesso à ficha com evolução, galeria, contratos e assinaturas.
            Requer bucket <code className="rounded bg-muted px-1 text-xs">clinical</code>{" "}
            no Storage (migração do repositório).
          </p>
        </div>
      </div>

      <NovoPacienteWizard />
    </div>
  );
}
