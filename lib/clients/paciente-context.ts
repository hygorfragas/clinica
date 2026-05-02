import {
  canAccessAgenda,
} from "@/lib/auth/clinic-profile";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type PacienteClinicContext = {
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>;
  tenantId: string;
  client: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    cpf: string | null;
    address: string | null;
    birth_date: string | null;
    notes: string | null;
    created_at: string;
  };
};

/** Carrega paciente do tenant atual ou retorna null (use com notFound()). */
export async function loadPacienteClinicContext(
  clientId: string,
): Promise<PacienteClinicContext | null> {
  const supabase = createServiceRoleClient();
  const user = await getCurrentUserFromServerCookies();
  if (!user) {
    return null;
  }

  const profile = { role: user.role, tenant_id: user.tenantId };
  if (!profile?.tenant_id || !canAccessAgenda(profile)) {
    return null;
  }

  const { data: client, error } = await supabase
    .schema("clinic")
    .from("clients")
    .select(
      "id, full_name, email, phone, cpf, address, birth_date, notes, created_at",
    )
    .eq("id", clientId)
    .eq("tenant_id", profile.tenant_id)
    .is("hidden_from_ui_at", null)
    .maybeSingle();

  if (error || !client) {
    return null;
  }

  return {
    supabase,
    tenantId: profile.tenant_id,
    client,
  };
}
