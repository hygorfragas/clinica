import { redirect } from "next/navigation";
import { BudgetsManager } from "@/components/budgets/budgets-manager";
import { fetchClinicProfile } from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function OrcamentosPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id) redirect("/inicio");

  const tenantId = profile.tenant_id;
  const [clientsRes, proceduresRes, productsRes, budgetsRes, budgetItemsRes] = await Promise.all([
    supabase
      .schema("clinic")
      .from("clients")
      .select("id, full_name, cpf")
      .eq("tenant_id", tenantId)
      .is("hidden_from_ui_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .schema("clinic")
      .from("procedures")
      .select("id, name, price_cents")
      .eq("tenant_id", tenantId)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
    supabase
      .schema("clinic")
      .from("products")
      .select("id, name, price_cents")
      .eq("tenant_id", tenantId)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
    supabase
      .schema("clinic")
      .from("budgets")
      .select("id, title, status, subtotal_cents, discount_cents, total_cents, valid_until, created_at, client_id")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .schema("clinic")
      .from("budget_items")
      .select("id, budget_id, description, quantity, unit_price_cents, line_total_cents, display_order")
      .eq("tenant_id", tenantId)
      .order("display_order", { ascending: true }),
  ]);

  const clients = clientsRes.data ?? [];
  const procedures = proceduresRes.data ?? [];
  const products = productsRes.data ?? [];
  const budgets = budgetsRes.data ?? [];
  const budgetItems = budgetItemsRes.data ?? [];
  const clientNameById = new Map(clients.map((client) => [client.id, client.full_name]));
  const itemsByBudget = new Map<string, typeof budgetItems>();

  for (const item of budgetItems) {
    const current = itemsByBudget.get(item.budget_id) ?? [];
    current.push(item);
    itemsByBudget.set(item.budget_id, current);
  }

  const enrichedBudgets = budgets.map((budget) => ({
    ...budget,
    client_name: clientNameById.get(budget.client_id) ?? "Paciente removida",
    items: itemsByBudget.get(budget.id) ?? [],
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Orçamentos e procedimentos
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Monte propostas comerciais com itens do catálogo, exporte em PDF e
          compartilhe rapidamente no WhatsApp. Quando aprovada, a proposta pode
          ser lançada no financeiro da paciente.
        </p>
      </header>
      <BudgetsManager
        clients={clients}
        procedures={procedures}
        products={products}
        budgets={enrichedBudgets}
      />
    </div>
  );
}
