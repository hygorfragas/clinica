import { notFound } from "next/navigation";
import { PacienteDadosEditor } from "@/components/clients/paciente-dados-editor";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteResumoPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) {
    notFound();
  }

  const { client } = ctx;
  const initial = {
    full_name: client.full_name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    birth_date: client.birth_date ?? "",
    notes: client.notes ?? "",
  };

  return (
    <div className="space-y-8">
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
