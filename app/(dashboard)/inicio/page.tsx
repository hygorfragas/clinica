import Link from "next/link";
import { CalendarDays, ClipboardList, Package, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/clinic/stat-card";
import { buttonVariants } from "@/components/ui/button";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { firstNameFromFullName, greetingForHour } from "@/lib/greeting";
import { getDayBoundsUtcIso } from "@/lib/dates";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InicioPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile || !canAccessAgenda(profile)) {
    redirect("/aguardando-acesso");
  }

  const tenantId = profile.tenant_id;
  if (!tenantId) {
    redirect("/aguardando-acesso");
  }

  const { startIso, endIso } = getDayBoundsUtcIso(new Date());
  const hour = new Date().getHours();
  const greet = greetingForHour(hour);
  const first = firstNameFromFullName(profile.full_name);

  const [apptRes, clientsRes] = await Promise.all([
    supabase
      .schema("clinic")
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("starts_at", startIso)
      .lte("starts_at", endIso),
    supabase
      .schema("clinic")
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("hidden_from_ui_at", null),
  ]);

  const todayCount = apptRes.count ?? 0;
  const clientsCount = clientsRes.count ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-light tracking-tight text-ink md:text-[2.75rem] md:leading-[1.15]">
          {greet},{" "}
          <span className="font-bold text-brand">{first}</span>
        </h1>
        <p className="text-base leading-relaxed text-[#6c5c4d]">
          Sua rotina de hoje em um só lugar: agenda, pacientes e indicadores
          essenciais — com o mesmo cuidado visual da interface de referência.
        </p>
      </header>

      <section
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Indicadores do dia"
      >
        <StatCard
          tone="primary"
          icon={CalendarDays}
          value={todayCount}
          label="Agendamentos hoje"
          hint="Hoje"
        />
        <StatCard
          tone="secondary"
          icon={UsersRound}
          value={clientsCount}
          label="Pacientes cadastrados"
        />
        <StatCard
          tone="neutral"
          icon={ClipboardList}
          value="—"
          label="Orçamentos em aberto"
          hint="Em breve"
        />
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-surface/90 p-7 shadow-panel ring-1 ring-[rgba(42,68,59,0.06)] backdrop-blur-sm md:p-9">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Acesso rápido
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Atalhos para o fluxo diário da clínica.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/agenda"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            Ver agenda de hoje
          </Link>
          <Link
            href="/pacientes"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "inline-flex items-center gap-2",
            )}
          >
            <UsersRound className="h-4 w-4 opacity-90" aria-hidden />
            Pacientes
          </Link>
          <Link
            href="/estoque"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "inline-flex items-center gap-2",
            )}
          >
            <Package className="h-4 w-4 opacity-90" aria-hidden />
            Estoque
          </Link>
        </div>
      </section>
    </div>
  );
}
