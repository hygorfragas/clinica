import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { postLoginPathForClinicProfile } from "@/lib/auth/post-login-path";
import { resolveThemeForRequest } from "@/lib/theme/server";

function isTenantManagerRole(role: string, tenantId: string | null) {
  return Boolean(tenantId && (role === "owner" || role === "clinic_admin"));
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUserFromServerCookies();
  if (!user?.email) {
    redirect("/login");
  }

  const landing = postLoginPathForClinicProfile({
    role: user.role,
    tenant_id: user.tenantId,
  });
  const variant =
    landing === "/plataforma" ? "platform" : landing === "/inicio" ? "clinic" : null;

  if (!variant) {
    redirect("/aguardando-acesso");
  }

  const theme = await resolveThemeForRequest();
  const showEquipe = isTenantManagerRole(user.role, user.tenantId);
  const showFinanceiro = showEquipe;

  return (
    <ThemeProvider
      initialAccent={theme.accent}
      initialMode={theme.mode}
      userOverride={theme.userOverride}
      clinicDefault={theme.clinicDefault}
      canEditClinicDefault={showEquipe}
    >
      <AppShell
        variant={variant}
        userEmail={user.email}
        showEquipe={showEquipe}
        showFinanceiro={showFinanceiro}
        tenantId={variant === "clinic" ? user.tenantId : null}
      >
        {children}
      </AppShell>
    </ThemeProvider>
  );
}
