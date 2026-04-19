import { ProfessionalAssetsForm } from "@/components/configuracoes/professional-assets-form";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ConfigProfissionalPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id || !canAccessAgenda(profile)) {
    redirect("/inicio");
  }

  const { data: row } = await supabase
    .schema("clinic")
    .from("profiles")
    .select("stamp_storage_key, signature_storage_key")
    .eq("id", user.id)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  const hasStamp =
    typeof row?.stamp_storage_key === "string" &&
    row.stamp_storage_key.trim().length > 0;
  const hasSignature =
    typeof row?.signature_storage_key === "string" &&
    row.signature_storage_key.trim().length > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          Profissional — carimbo e assinatura
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Apenas você enxerga e altera seus arquivos. Gestoras podem abrir os
          mesmos arquivos para conferência operacional.
        </p>
      </header>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-8">
        <ProfessionalAssetsForm hasStamp={hasStamp} hasSignature={hasSignature} />
      </section>
    </div>
  );
}
