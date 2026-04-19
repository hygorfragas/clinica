import { InviteAgentForm } from "@/components/equipe/invite-agent-form";
import { fetchClinicProfile } from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietária",
  clinic_admin: "Administradora",
  agent: "Profissional",
  pending_registration: "Pendente",
};

export default async function EquipePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id) {
    redirect("/inicio");
  }

  const tenantId = profile.tenant_id;

  const { data: members, error } = await supabase
    .schema("clinic")
    .from("profiles")
    .select(
      "id, full_name, role, phone, professional_registration, created_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Equipe da clínica
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Administradoras podem cadastrar profissionais com ficha completa e
          ativos de assinatura/carimbo. Dados isolados por clínica (RLS).
        </p>
      </header>

      <InviteAgentForm />

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-8">
        <h2 className="text-sm font-semibold tracking-wide text-ink">
          Profissionais e gestoras nesta clínica
        </h2>
        {error ? (
          <p className="mt-4 text-sm text-danger">
            Não foi possível carregar a lista. Tente novamente.
          </p>
        ) : members && members.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3.5"
              >
                <div>
                  <p className="font-medium text-ink">{m.full_name}</p>
                  <p className="text-xs text-ink-subtle">
                    {ROLE_LABEL[m.role] ?? m.role}
                    {m.professional_registration
                      ? ` · Reg. ${m.professional_registration}`
                      : ""}
                    {m.phone ? ` · ${m.phone}` : ""}
                  </p>
                </div>
                <time
                  className="text-xs tabular-nums text-ink-muted"
                  dateTime={m.created_at}
                >
                  {new Date(m.created_at).toLocaleDateString("pt-BR")}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Nenhum membro listado ainda. Cadastre a primeira profissional acima.
          </p>
        )}
      </section>
    </div>
  );
}
