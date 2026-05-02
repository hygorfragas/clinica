import { redirect } from "next/navigation";
import { ContasPanel } from "@/components/financeiro/contas-panel";
import { requireFinancialContext } from "@/lib/financial/access";
import { listAccountsWithBalance } from "@/lib/financial/queries";

export default async function FinanceiroContasPage() {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) redirect("/inicio");

  const accounts = await listAccountsWithBalance(ctx.supabase, ctx.tenantId);
  return <ContasPanel accounts={accounts} />;
}
