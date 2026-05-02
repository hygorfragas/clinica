import type { ReactNode } from "react";
import { ConfiguracoesSubnav } from "@/components/configuracoes/configuracoes-subnav";
import {
  fetchClinicProfile,
  isClinicAdmin,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await fetchClinicProfile(supabase, user.id) : null;
  const adminAccess = isClinicAdmin(profile);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <ConfiguracoesSubnav isClinicAdmin={adminAccess} />
      {children}
    </div>
  );
}
