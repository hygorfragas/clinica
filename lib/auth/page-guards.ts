import { redirect } from "next/navigation";
import {
  fetchClinicProfile,
  isClinicAdmin,
  type ClinicProfileRow,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Profile garantido ter `tenant_id` (não-null) — útil pra páginas admin que
 * sempre precisam do tenant.
 */
export type ClinicAdminProfile = ClinicProfileRow & { tenant_id: string };

/**
 * Guard server-side para páginas que exigem `clinic_admin` (Configurações
 * administrativas, Financeiro, Equipe). Validação de perfil é feita contra o
 * banco — frontend só respeita.
 *
 * Comportamento:
 * - Sem sessão → /login
 * - Sem perfil ou tenant → /aguardando-acesso
 * - Não é clinic_admin → /configuracoes/perfil (rota universal)
 *
 * Retorna o profile carregado para a página usar (tenant_id garantido).
 */
export async function requireClinicAdminPage(): Promise<ClinicAdminProfile> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id) redirect("/aguardando-acesso");
  if (!isClinicAdmin(profile)) redirect("/configuracoes/perfil");
  return profile as ClinicAdminProfile;
}
