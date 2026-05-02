import { redirect } from "next/navigation";
import { ProfileThemePanel } from "@/components/theme/profile-theme-panel";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveThemeForRequest } from "@/lib/theme/server";

export const metadata = {
  title: "Meu perfil",
};

export default async function PerfilPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const theme = await resolveThemeForRequest();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Meu perfil
        </h1>
        <p className="text-sm text-ink-muted">
          Personalize o sistema para você — tema, paleta e senha.
        </p>
      </header>
      <ProfileThemePanel
        userOverride={theme.userOverride}
        clinicDefault={theme.clinicDefault}
      />
    </div>
  );
}
