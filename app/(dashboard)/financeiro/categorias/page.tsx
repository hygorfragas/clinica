import { redirect } from "next/navigation";
import { CategoriasPanel } from "@/components/financeiro/categorias-panel";
import { requireFinancialContext } from "@/lib/financial/access";
import { listCategories } from "@/lib/financial/queries";

export default async function FinanceiroCategoriasPage() {
  const ctx = await requireFinancialContext();
  if (!ctx.ok) redirect("/inicio");

  const categories = await listCategories(ctx.supabase, ctx.tenantId, {
    includeArchived: true,
  });
  return <CategoriasPanel categories={categories} />;
}
