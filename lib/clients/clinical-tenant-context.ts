import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ClinicSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

export type ClinicalTenantContext = {
  supabase: ClinicSupabaseClient;
  tenantId: string;
  /** auth.users.id do usuário logado (clinic.profiles.id). */
  userId: string;
};

export type ClinicalActionError = { ok: false; error: string };

export async function requireClinicalTenantContext(): Promise<
  ({ ok: true } & ClinicalTenantContext) | ClinicalActionError
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id || !canAccessAgenda(profile)) {
    return { ok: false, error: "Sem permissão para esta ação." };
  }
  return {
    ok: true,
    supabase,
    tenantId: profile.tenant_id,
    userId: user.id,
  };
}
