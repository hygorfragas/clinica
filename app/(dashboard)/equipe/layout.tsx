import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchClinicProfile,
  isPlatformSuperAdmin,
  isTenantManager,
} from "@/lib/auth/clinic-profile";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Equipe (profissionais): apenas owner ou clinic_admin do tenant. */
export default async function EquipeLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isSupabasePublicEnvConfigured()) {
    redirect("/");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!isTenantManager(profile)) {
    if (isPlatformSuperAdmin(profile)) {
      redirect("/plataforma");
    }
    redirect("/inicio");
  }

  return children;
}
