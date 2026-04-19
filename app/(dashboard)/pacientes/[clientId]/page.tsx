import { notFound } from "next/navigation";
import { PacienteDadosEditor } from "@/components/clients/paciente-dados-editor";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function PacienteResumoPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const { client } = ctx;
  const nowIso = new Date().toISOString();

  const [purchasesRes, nextAppointmentRes, lastEvolutionRes, lastSubmissionRes] =
    await Promise.all([
      ctx.supabase
        .schema("clinic")
        .from("client_procedure_purchases")
        .select("id, total_cents, purchased_at")
        .eq("client_id", clientId)
        .eq("tenant_id", ctx.tenantId),
      ctx.supabase
        .schema("clinic")
        .from("appointments")
        .select("id, starts_at, title, status")
        .eq("client_id", clientId)
        .eq("tenant_id", ctx.tenantId)
        .gte("starts_at", nowIso)
        .in("status", ["scheduled", "confirmed"])
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      ctx.supabase
        .schema("clinic")
        .from("evolutions")
        .select("id, body, created_at")
        .eq("client_id", clientId)
        .eq("tenant_id", ctx.tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ctx.supabase
        .schema("clinic")
        .from("anamnesis_submissions")
        .select("id, status, updated_at")
        .eq("client_id", clientId)
        .eq("tenant_id", ctx.tenantId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const purchases = purchasesRes.data ?? [];
  const totalInvestidoCents = purchases.reduce((s, p) => s + p.total_cents, 0);
  const nextAppointment = nextAppointmentRes.data ?? null;
  const lastEvolution = lastEvolutionRes.data ?? null;
  const lastSubmission = lastSubmissionRes.data ?? null;

  const initial = {
    full_name: client.full_name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    cpf: client.cpf ?? "",
    address: client.address ?? "",
    birth_date: client.birth_date ?? "",
    notes: client.notes ?? "",
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total investido"
          value={BRL.format(totalInvestidoCents / 100)}
          hint={`${purchases.length} compra(s)`}
        />
        <StatCard
          title="Próxima sessão"
          value={
            nextAppointment?.starts_at
              ? new Date(nextAppointment.starts_at).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "—"
          }
          hint={nextAppointment?.title ?? ""}
        />
        <StatCard
          title="Última evolução"
          value={
            lastEvolution
              ? new Date(lastEvolution.created_at).toLocaleDateString("pt-BR")
              : "—"
          }
          hint={
            lastEvolution?.body
              ? lastEvolution.body.slice(0, 60) +
                (lastEvolution.body.length > 60 ? "…" : "")
              : "Sem registros"
          }
        />
        <StatCard
          title="Anamnese"
          value={
            lastSubmission
              ? statusLabel(lastSubmission.status)
              : "Não preenchida"
          }
          hint={
            lastSubmission
              ? new Date(lastSubmission.updated_at).toLocaleDateString("pt-BR")
              : ""
          }
        />
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Contato
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-ink-muted">E-mail</dt>
              <dd className="font-medium text-ink">{client.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Telefone</dt>
              <dd className="font-medium text-ink">{client.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">CPF / documento</dt>
              <dd className="font-medium text-ink">{client.cpf ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Endereço</dt>
              <dd className="font-medium text-ink">{client.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Nascimento</dt>
              <dd className="font-medium text-ink">
                {client.birth_date
                  ? new Date(client.birth_date).toLocaleDateString("pt-BR")
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="rounded-[1.75rem] bg-muted/40 p-6 ring-1 ring-line/60 md:p-7">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Observações rápidas
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink">
            {client.notes?.trim() || "Nenhuma observação cadastral."}
          </p>
        </section>
      </div>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Editar dados cadastrais
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Alterações ficam no mesmo registro da paciente e respeitam o isolamento
          por clínica.
        </p>
        <div className="mt-6">
          <PacienteDadosEditor clientId={clientId} initial={initial} />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function statusLabel(s: "draft" | "submitted" | "signed"): string {
  return { draft: "Rascunho", submitted: "Finalizada", signed: "Assinada" }[s];
}
