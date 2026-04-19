import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isPlatformSuperAdmin,
  isTenantManager,
} from "@/lib/auth/clinic-profile";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  return (
    <AppShell
      variant={variant}
      userEmail={user.email}
      showEquipe={isTenantManager(profile)}
    >
      {children}
    </AppShell>
  );
}
