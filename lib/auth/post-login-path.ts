import type { ClinicProfileRow } from "./clinic-profile";
import { canAccessAgenda, isPlatformSuperAdmin } from "./clinic-profile";

export type PostLoginPath = "/plataforma" | "/inicio" | "/aguardando-acesso";

/** Destino após login conforme perfil em `clinic.profiles`. */
export function postLoginPathForClinicProfile(
  profile: Pick<ClinicProfileRow, "tenant_id" | "role"> | null,
): PostLoginPath {
  const row = profile as ClinicProfileRow | null;
  if (isPlatformSuperAdmin(row)) return "/plataforma";
  if (canAccessAgenda(row)) return "/inicio";
  return "/aguardando-acesso";
}
