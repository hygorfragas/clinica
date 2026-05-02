import { redirect } from "next/navigation";
import { RelatoriosPanel } from "@/components/financeiro/relatorios-panel";
import { requireFinancialContext } from "@/lib/financial/access";
import {
  defaultMonthRange,
  loadDreReport,
  loadPendingTransactions,
  loadRevenueByProcedure,
  loadRevenueByProfile,
} from "@/lib/financial/reports";

type SearchParams = { from?: string; to?: string };

export default async function FinanceiroRelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) redirect("/inicio");
  const sp = await searchParams;
  const range = {
    from: sp.from || defaultMonthRange().from,
    to: sp.to || defaultMonthRange().to,
  };

  const [dre, receivables, payables, byProcedure, byProfile] =
    await Promise.all([
      loadDreReport(ctx.supabase, ctx.tenantId, range),
      loadPendingTransactions(ctx.supabase, ctx.tenantId, "income"),
      loadPendingTransactions(ctx.supabase, ctx.tenantId, "expense"),
      loadRevenueByProcedure(ctx.supabase, ctx.tenantId, range),
      loadRevenueByProfile(ctx.supabase, ctx.tenantId, range),
    ]);

  return (
    <RelatoriosPanel
      range={range}
      dre={dre}
      receivables={receivables}
      payables={payables}
      byProcedure={byProcedure}
      byProfile={byProfile}
    />
  );
}
