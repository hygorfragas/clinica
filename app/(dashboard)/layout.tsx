import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isClinicAdmin,
  isPlatformSuperAdmin,
  isTenantManager,
} from "@/lib/auth/clinic-profile";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveThemeForRequest } from "@/lib/theme/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (!isSupabasePublicEnvConfigured()) {
    redirect("/");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile) {
    redirect("/login");
  }

  const variant = isPlatformSuperAdmin(profile)
    ? "platform"
    : canAccessAgenda(profile)
      ? "clinic"
      : null;

  if (!variant) {
    redirect("/aguardando-acesso");
  }

  const theme = await resolveThemeForRequest();

  return (
    <ThemeProvider
      initialAccent={theme.accent}
      initialMode={theme.mode}
      userOverride={theme.userOverride}
      clinicDefault={theme.clinicDefault}
      canEditClinicDefault={isTenantManager(profile)}
    >
      <AppShell
        variant={variant}
        userEmail={user.email}
        isClinicAdmin={isClinicAdmin(profile)}
        tenantId={variant === "clinic" ? profile.tenant_id : null}
      >
        {children}
      </AppShell>
    </ThemeProvider>
  );
}
