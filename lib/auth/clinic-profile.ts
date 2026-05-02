import { createServerClient } from "@supabase/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/** União dos clientes SSR usados em middleware e em Server Components. */
export type ClinicSupabaseForProfile =
  | Awaited<ReturnType<typeof createServerSupabaseClient>>
  | ReturnType<typeof createServerClient<Database>>;

export type ClinicProfileRow =
  Database["clinic"]["Tables"]["profiles"]["Row"];

type ProfileAccessShape = Pick<ClinicProfileRow, "role" | "tenant_id"> | null;

const TENANT_ROLES = new Set(["owner", "clinic_admin", "agent"]);

const TENANT_MANAGER_ROLES = new Set(["owner", "clinic_admin"]);

export function canAccessAgenda(profile: ProfileAccessShape): boolean {
  if (!profile?.tenant_id) return false;
  return TENANT_ROLES.has(profile.role);
}

/** Owner ou administrador da clínica: pode gerir agentes no tenant. */
export function isTenantManager(profile: ProfileAccessShape): boolean {
  if (!profile?.tenant_id) return false;
  return TENANT_MANAGER_ROLES.has(profile.role);
}

export function isPlatformSuperAdmin(
  profile: ProfileAccessShape,
): boolean {
  if (!profile || profile.tenant_id != null) return false;
  // Regra do produto: quando logado como `owner` (sem tenant) é Superadmin.
  return profile.role === "owner" || profile.role === "platform_super_admin";
}

export function isPendingRegistration(
  profile: ProfileAccessShape,
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
    const msg = error.message ?? "";
    if (msg.includes("Invalid schema") || msg.includes("schema")) {
      console.error(
        "fetchClinicProfile:",
        msg,
        "→ No Supabase: Settings → API → Exposed schemas, inclua `clinic` (além de `public`).",
      );
    } else {
      console.error("fetchClinicProfile", msg);
    }
    return null;
  }
  return data;
}
