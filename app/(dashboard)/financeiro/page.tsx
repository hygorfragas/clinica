import { redirect } from "next/navigation";
import { VisaoGeralPanel } from "@/components/financeiro/visao-geral-panel";
import { requireFinancialContext } from "@/lib/financial/access";
import {
  listAccountsWithBalance,
  loadFinancialKpis,
} from "@/lib/financial/queries";

export default async function FinanceiroVisaoGeralPage() {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) redirect("/inicio");

  const [accounts, kpis] = await Promise.all([
    listAccountsWithBalance(ctx.supabase, ctx.tenantId),
    loadFinancialKpis(ctx.supabase, ctx.tenantId),
  ]);

  return <VisaoGeralPanel accounts={accounts} kpis={kpis} />;
}
