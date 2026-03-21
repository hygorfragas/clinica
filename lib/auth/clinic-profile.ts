import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/** União dos clientes SSR usados em middleware e em Server Components. */
export type ClinicSupabaseForProfile =
  | Awaited<ReturnType<typeof createServerSupabaseClient>>
  | ReturnType<typeof createServerClient<Database>>;

export type ClinicProfileRow =
  Database["clinic"]["Tables"]["profiles"]["Row"];

const TENANT_ROLES = new Set(["owner", "clinic_admin", "agent"]);

export function canAccessAgenda(profile: ClinicProfileRow | null): boolean {
  if (!profile?.tenant_id) return false;
  return TENANT_ROLES.has(profile.role);
}

export function isPlatformSuperAdmin(
  profile: ClinicProfileRow | null,
): boolean {
  return profile?.role === "platform_super_admin" && profile.tenant_id == null;
}

export function isPendingRegistration(
  profile: ClinicProfileRow | null,
): boolean {
  return profile?.role === "pending_registration";
}

export async function fetchClinicProfile(
  supabase: ClinicSupabaseForProfile,
  userId: string,
): Promise<ClinicProfileRow | null> {
  const { data, error } = await supabase
    .schema("clinic")
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("fetchClinicProfile", error.message);
    return null;
  }
  return data;
}
