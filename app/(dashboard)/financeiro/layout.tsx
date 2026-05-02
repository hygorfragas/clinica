import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { FinanceiroSubnav } from "@/components/financeiro/financeiro-subnav";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { postLoginPathForClinicProfile } from "@/lib/auth/post-login-path";

export default async function FinanceiroLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUserFromServerCookies();
  if (!user) redirect("/login");

  const landing = postLoginPathForClinicProfile({
    role: user.role,
    tenant_id: user.tenantId,
  });
  const canAccessFinancial = Boolean(
    user.tenantId && (user.role === "owner" || user.role === "clinic_admin"),
  );

  if (!canAccessFinancial) {
    if (landing === "/plataforma") {
      redirect("/plataforma");
    }
    redirect("/inicio");
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
