import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FinanceiroSubnav } from "@/components/financeiro/financeiro-subnav";
import {
  fetchClinicProfile,
  isPlatformSuperAdmin,
} from "@/lib/auth/clinic-profile";
import { canAccessFinancial } from "@/lib/financial/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function FinanceiroLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await fetchClinicProfile(supabase, user.id);

  // Validação no banco (clinic.profiles.role + tenant_id).
  // Frontend só respeita o resultado.
  if (!canAccessFinancial(profile)) {
    return (
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-subtle">
            Financeiro
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Acesso restrito
          </h1>
        </header>
        <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <p className="text-sm font-medium text-amber-900">
            O módulo Financeiro é exclusivo do(a){" "}
            <strong>administrador(a) da clínica</strong> (papel{" "}
            <code className="rounded bg-amber-100/70 px-1">clinic_admin</code>{" "}
            com tenant vinculado).
          </p>
          <ul className="mt-3 space-y-1 text-sm text-amber-900">
            <li>
              · Sessão (auth.users):{" "}
              <code className="rounded bg-amber-100/70 px-1">
                {user.email ?? "—"}
              </code>{" "}
              ({user.id.slice(0, 8)}…)
            </li>
            <li>
              · Profile carregado:{" "}
              <code className="rounded bg-amber-100/70 px-1">
                {profile ? "sim" : "NÃO (RLS bloqueando ou sem registro)"}
              </code>
            </li>
            <li>
              · Papel atual:{" "}
              <code className="rounded bg-amber-100/70 px-1">
                {profile?.role ?? "desconhecido"}
              </code>
            </li>
            <li>
              · Tenant vinculado:{" "}
              <code className="rounded bg-amber-100/70 px-1">
                {profile?.tenant_id ?? "nenhum"}
              </code>
            </li>
            {isPlatformSuperAdmin(profile) ? (
              <li className="mt-2 text-amber-900">
                Você está logado como{" "}
                <strong>super administrador da plataforma</strong> (sem tenant).
                Para ver o Financeiro de uma clínica, use{" "}
                <Link
                  href="/plataforma"
                  className="font-semibold text-amber-900 underline"
                >
                  Plataforma → Entrar como
                </Link>{" "}
                no <code className="rounded bg-amber-100/70 px-1">clinic_admin</code>{" "}
                daquela clínica.
              </li>
            ) : null}
          </ul>
          <div className="mt-4">
            <Link
              href="/inicio"
              className="text-sm font-medium text-amber-900 hover:underline"
            >
              ← Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-subtle">
          Financeiro
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Controle financeiro da clínica
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Receitas, despesas, contas a receber/pagar, saldo por conta e
          relatórios — tudo conectado às vendas e orçamentos automaticamente.
        </p>
        <FinanceiroSubnav />
      </header>
      {children}
    </div>
  );
}
