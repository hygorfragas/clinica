import { redirect } from "next/navigation";
import { NewSaleWizard } from "@/components/sales/new-sale-wizard";
import { fetchClinicProfile } from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NovaVendaPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id) redirect("/inicio");
  const tenantId = profile.tenant_id;

  const [clientsRes, proceduresRes] = await Promise.all([
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
      .select(
        "id, name, price_cents, contract_template_id, requires_signed_contract",
      )
      .eq("tenant_id", tenantId)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Nova venda
        </h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Selecione paciente e procedimento. Se houver pendências de cadastro,
          anamnese ou contrato, a venda fica bloqueada até que sejam resolvidas.
        </p>
      </header>

      <NewSaleWizard
        clients={clientsRes.data ?? []}
        procedures={proceduresRes.data ?? []}
      />
    </div>
  );
}
