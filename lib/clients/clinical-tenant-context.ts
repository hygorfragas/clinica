import {
  canAccessAgenda,
} from "@/lib/auth/clinic-profile";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type ClinicSupabaseClient = Awaited<
  ReturnType<typeof createServiceRoleClient>
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
  const supabase = createServiceRoleClient();
  const user = await getCurrentUserFromServerCookies();
  if (!user?.userId) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const profile = { role: user.role, tenant_id: user.tenantId };
  if (!profile?.tenant_id || !canAccessAgenda(profile)) {
    return { ok: false, error: "Sem permissão para esta ação." };
  }
  return {
    ok: true,
    supabase,
    tenantId: profile.tenant_id,
    userId: user.userId,
  };
}
