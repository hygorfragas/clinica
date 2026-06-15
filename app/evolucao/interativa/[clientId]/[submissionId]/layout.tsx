import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EvolucaoInterativaLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isSupabasePublicEnvConfigured()) redirect("/");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile || !canAccessAgenda(profile)) {
    redirect("/aguardando-acesso");
  }

  return (
    <div className="min-h-dvh w-full bg-canvas font-sans text-[15px]">
      {children}
    </div>
  );
}
