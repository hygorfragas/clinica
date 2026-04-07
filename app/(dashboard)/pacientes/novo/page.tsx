import Link from "next/link";
import { NovoPacienteForm } from "@/components/clients/novo-paciente-form";
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
    <div className="mx-auto max-w-2xl space-y-8">
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
          <p className="mt-2 text-sm text-ink-muted">
            Cadastro vinculado à sua clínica; só sua equipe enxerga estes dados.
          </p>
        </div>
      </div>

      <NovoPacienteForm />
    </div>
  );
}
