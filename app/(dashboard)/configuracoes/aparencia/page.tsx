import { ClinicAppearancePanel } from "@/components/theme/clinic-appearance-panel";
import { requireClinicAdminPage } from "@/lib/auth/page-guards";
import { resolveThemeForRequest } from "@/lib/theme/server";

export const metadata = {
  title: "Aparência da clínica",
};

export default async function AparenciaPage() {
  await requireClinicAdminPage();
  const theme = await resolveThemeForRequest();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Aparência da clínica
        </h1>
        <p className="text-sm text-ink-muted">
          Estes valores são o padrão aplicado a todo mundo da clínica que ainda não escolheu no próprio perfil.
        </p>
      </header>
      <ClinicAppearancePanel initial={theme.clinicDefault} />
    </div>
  );
}
