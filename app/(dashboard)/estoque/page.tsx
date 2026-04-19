import { redirect } from "next/navigation";
import { StockTabs } from "@/components/stock/stock-tabs";
import { fetchClinicProfile } from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function EstoquePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id) redirect("/inicio");
  const tenantId = profile.tenant_id;

  const [productsRes, proceduresRes, templatesRes] = await Promise.all([
    supabase
      .schema("clinic")
      .from("products")
      .select(
        "id, name, sku, unit, stock_quantity, low_stock_threshold, cost_cents, price_cents, is_archived",
      )
      .eq("tenant_id", tenantId)
      .order("is_archived", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .schema("clinic")
      .from("procedures")
      .select(
        "id, name, description, duration_minutes, cost_cents, profit_margin_percent, price_cents, contract_template_id, requires_signed_contract, is_archived",
      )
      .eq("tenant_id", tenantId)
      .order("is_archived", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .schema("clinic")
      .from("contract_templates")
      .select("id, title, is_default")
      .eq("tenant_id", tenantId)
      .order("title", { ascending: true }),
  ]);

  const products = (productsRes.data ?? []).map((p) => ({
    ...p,
    stock_quantity: Number(p.stock_quantity),
    low_stock_threshold: Number(p.low_stock_threshold),
  }));

  const procedures = (proceduresRes.data ?? []).map((p) => ({
    ...p,
    profit_margin_percent: Number(p.profit_margin_percent),
  }));

  const contractTemplates = templatesRes.data ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Estoque e procedimentos
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Produtos em estoque e procedimentos da clínica compartilham a mesma
          base. Cadastre custo, margem e preço para que vendas e agendamentos
          possam usá-los de forma consistente.
        </p>
      </header>

      <StockTabs
        products={products}
        procedures={procedures}
        contractTemplates={contractTemplates}
      />
    </div>
  );
}
