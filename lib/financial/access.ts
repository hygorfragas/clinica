import {
  isClinicAdmin,
  type ClinicProfileRow,
} from "@/lib/auth/clinic-profile";
import { fetchClinicProfile } from "@/lib/auth/clinic-profile";
import {
  requireClinicalTenantContext,
  type ClinicSupabaseClient,
} from "@/lib/clients/clinical-tenant-context";

/**
 * Acesso ao módulo financeiro: APENAS `clinic_admin` com tenant vinculado.
 * Regra confirmada pelo CEO em 2026-05-02.
 */
export function canAccessFinancial(profile: ClinicProfileRow | null): boolean {
  return isClinicAdmin(profile);
}

export type FinancialContext = {
  supabase: ClinicSupabaseClient;
  tenantId: string;
  userId: string;
  profile: ClinicProfileRow;
};

export type FinancialContextError = { ok: false; error: string };

/**
 * Garante que o usuário logado pode acessar o módulo financeiro.
 * Retorna o contexto com tenant + perfil já carregado.
 */
export async function requireFinancialContext(): Promise<
  ({ ok: true } & FinancialContext) | FinancialContextError
> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const profile = await fetchClinicProfile(ctx.supabase, ctx.userId);
  if (!profile || !canAccessFinancial(profile)) {
    return {
      ok: false,
      error: "Acesso ao Financeiro restrito ao(à) responsável da clínica.",
    };
  }
  return {
    ok: true,
    supabase: ctx.supabase,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    profile,
  };
}
