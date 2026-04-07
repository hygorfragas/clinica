import { notFound } from "next/navigation";
import { PacienteAnamneseForm } from "@/components/clients/paciente-anamnese-form";
import { parseAnamnesisPayload } from "@/lib/anamnesis/schema";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteAnamnesePage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) {
    notFound();
  }

  const { data: latest } = await ctx.supabase
    .schema("clinic")
    .from("anamnesis_forms")
    .select("payload")
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initialPayload = parseAnamnesisPayload(latest?.payload);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Formulário de anamnese para estética. Os dados são mesclados ao salvar
        (uma ficha ativa por paciente neste MVP).
      </p>
      <PacienteAnamneseForm clientId={clientId} initialPayload={initialPayload} />
    </div>
  );
}
