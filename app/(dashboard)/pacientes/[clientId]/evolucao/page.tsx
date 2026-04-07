import { notFound } from "next/navigation";
import { PacienteEvolucaoPanel } from "@/components/clients/paciente-evolucao-panel";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteEvolucaoPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) {
    notFound();
  }

  const { data: rows, error } = await ctx.supabase
    .schema("clinic")
    .from("evolutions")
    .select("id, body, created_at")
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-danger">
        Não foi possível carregar as evoluções.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Registro cronológico de sessões e observações clínicas.
      </p>
      <PacienteEvolucaoPanel clientId={clientId} entries={rows ?? []} />
    </div>
  );
}
