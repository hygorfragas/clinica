import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PacienteClinicContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  tenantId: string;
  client: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    notes: string | null;
    created_at: string;
  };
};

/** Carrega paciente do tenant atual ou retorna null (use com notFound()). */
export async function loadPacienteClinicContext(
  clientId: string,
): Promise<PacienteClinicContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id || !canAccessAgenda(profile)) {
    return null;
  }

  const { data: client, error } = await supabase
    .schema("clinic")
    .from("clients")
    .select(
      "id, full_name, email, phone, birth_date, notes, created_at",
    )
    .eq("id", clientId)
    .eq("tenant_id", profile.tenant_id)
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
