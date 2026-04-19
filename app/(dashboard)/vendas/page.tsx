import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SalesChart } from "@/components/sales/sales-chart";
import { fetchClinicProfile } from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function VendasPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile?.tenant_id) redirect("/inicio");
  const tenantId = profile.tenant_id;

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [monthRes, historyRes, latestRes] = await Promise.all([
    supabase
      .schema("clinic")
      .from("client_procedure_purchases")
      .select("id, total_cents, purchased_at")
      .eq("tenant_id", tenantId)
      .gte("purchased_at", firstDayOfMonth.toISOString()),
    supabase
      .schema("clinic")
      .from("client_procedure_purchases")
      .select("id, total_cents, purchased_at")
      .eq("tenant_id", tenantId)
      .gte("purchased_at", sixMonthsAgo.toISOString()),
    supabase
      .schema("clinic")
      .from("client_procedure_purchases")
      .select(
        "id, title, total_cents, purchased_at, client_id, procedure_id, clients!inner (full_name)",
      )
      .eq("tenant_id", tenantId)
      .order("purchased_at", { ascending: false })
      .limit(20),
  ]);

  const monthTotalCents = (monthRes.data ?? []).reduce(
    (s, r) => s + r.total_cents,
    0,
  );
  const monthCount = monthRes.data?.length ?? 0;
  const avgTicketCents = monthCount > 0 ? Math.round(monthTotalCents / monthCount) : 0;

  const byMonth = new Map<string, { total: number; count: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    byMonth.set(key, { total: 0, count: 0 });
  }
  for (const r of historyRes.data ?? []) {
    const key = r.purchased_at.slice(0, 7);
    const bucket = byMonth.get(key);
    if (bucket) {
      bucket.total += r.total_cents;
      bucket.count += 1;
    }
  }
  const chartData = Array.from(byMonth.entries()).map(([k, v]) => ({
    month: new Date(`${k}-01`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    total: v.total / 100,
    count: v.count,
  }));

  const last3 = chartData.slice(-3);
  const avgLast3 =
    last3.length > 0
      ? last3.reduce((s, r) => s + r.total, 0) / last3.length
      : 0;

  const latest = latestRes.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Vendas
          </h1>
          <p className="max-w-2xl text-sm text-ink-muted">
            Resumo de receita, tendência dos últimos meses e histórico recente.
            Uma venda só pode ser registrada quando a paciente tiver cadastro,
            anamnese e, se exigido, contrato assinado.
          </p>
        </div>
        <Link href="/vendas/nova">
          <Button>Nova venda</Button>
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Receita do mês" value={BRL.format(monthTotalCents / 100)} />
        <Stat title="Vendas no mês" value={String(monthCount)} />
        <Stat title="Ticket médio" value={BRL.format(avgTicketCents / 100)} />
        <Stat title="Projeção (média 3m)" value={BRL.format(avgLast3)} />
      </section>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Tendência (6 meses)
        </h2>
        <div className="mt-4 h-64">
          <SalesChart data={chartData} />
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Últimas vendas
        </h2>
        {latest.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Nenhuma venda registrada.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {latest.map((s) => {
              const client = Array.isArray(s.clients) ? s.clients[0] : s.clients;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink">
                      <Link
                        href={`/pacientes/${s.client_id}/financeiro`}
                        className="hover:underline"
                      >
                        {client?.full_name ?? "Paciente"}
                      </Link>{" "}
                      · {s.title}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {new Date(s.purchased_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <p className="font-semibold text-ink">
                    {BRL.format(s.total_cents / 100)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}
