import Link from "next/link";
import { Plus } from "lucide-react";
import { PacientesLista } from "@/components/clients/pacientes-lista";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

type ClientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export default async function PacientesPage() {
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

  const tenantId = profile.tenant_id;
  if (!tenantId) {
    redirect("/aguardando-acesso");
  }

  const { data: raw, error } = await supabase
    .schema("clinic")
    .from("clients")
    .select("id, full_name, phone, email, created_at")
    .eq("tenant_id", tenantId)
    .is("hidden_from_ui_at", null)
    .order("full_name", { ascending: true });

  const clients = (raw ?? []) as ClientRow[];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Pacientes
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Cadastro centralizado com prontuário: anamnese, evolução, fotos,
            documentos e assinaturas. Use &quot;Nova paciente&quot; para o fluxo
            guiado ou abra a ficha para continuar o preenchimento.
          </p>
        </header>
        <Link
          href="/pacientes/novo"
          className={cn(
            buttonVariants({ variant: "primary" }),
            "inline-flex shrink-0 items-center gap-2 self-start sm:self-auto",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nova paciente
        </Link>
      </div>

      <section
        className="overflow-hidden rounded-[1.75rem] bg-surface shadow-lift ring-1 ring-line"
        aria-label="Lista de pacientes"
      >
        {error ? (
          <p className="p-6 text-sm text-danger">
            Não foi possível carregar os pacientes. Tente novamente.
          </p>
        ) : clients.length === 0 ? (
          <div className="p-8">
            <p className="text-sm text-ink-muted">
              Nenhuma paciente cadastrada ainda. Comece pelo primeiro cadastro
              para usar na agenda e no prontuário.
            </p>
            <Link
              href="/pacientes/novo"
              className={cn(
                buttonVariants({ variant: "primary" }),
                "mt-6 inline-flex items-center gap-2",
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Cadastrar paciente
            </Link>
          </div>
        ) : (
          <PacientesLista clients={clients} />
        )}
      </section>
    </div>
  );
}
