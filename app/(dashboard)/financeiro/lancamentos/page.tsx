import { redirect } from "next/navigation";
import { LancamentosPanel } from "@/components/financeiro/lancamentos-panel";
import { requireFinancialContext } from "@/lib/financial/access";
import {
  listAccounts,
  listCategories,
  listPaymentMethods,
  listTransactions,
} from "@/lib/financial/queries";

type SearchParams = {
  from?: string;
  to?: string;
  kind?: string;
  status?: string;
  account?: string;
  category?: string;
  q?: string;
};

export default async function FinanceiroLancamentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) redirect("/inicio");
  const sp = await searchParams;

  const [accounts, categories, methods, txs] = await Promise.all([
    listAccounts(ctx.supabase, ctx.tenantId, { includeArchived: true }),
    listCategories(ctx.supabase, ctx.tenantId, { includeArchived: true }),
    listPaymentMethods(ctx.supabase, ctx.tenantId, { includeArchived: true }),
    listTransactions(ctx.supabase, ctx.tenantId, {
      from: sp.from,
      to: sp.to,
      kind:
        sp.kind === "income" || sp.kind === "expense" ? sp.kind : undefined,
      status:
        sp.status === "paid" ||
        sp.status === "pending" ||
        sp.status === "cancelled"
          ? sp.status
          : undefined,
      accountId: sp.account || undefined,
      categoryId: sp.category || undefined,
      searchTerm: sp.q || undefined,
      limit: 200,
    }),
  ]);

  return (
    <LancamentosPanel
      transactions={txs}
      accounts={accounts}
      categories={categories}
      paymentMethods={methods}
      filters={{
        from: sp.from ?? "",
        to: sp.to ?? "",
        kind: sp.kind ?? "",
        status: sp.status ?? "",
        account: sp.account ?? "",
        category: sp.category ?? "",
        q: sp.q ?? "",
      }}
    />
  );
}
