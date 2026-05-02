import { notFound } from "next/navigation";
import { PacienteHistoricoPanel } from "@/components/clients/paciente-historico-panel";
import { listBrandingProfiles } from "@/lib/branding/actions";
import { SYSTEM_DOCUMENT_KINDS } from "@/lib/clinical/document-kinds";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteHistoricoPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const [
    anamnesisFormsRes,
    anamnesisSubmissionsRes,
    evolutionsRes,
    budgetsRes,
    purchasesRes,
    photosRes,
    exportsRes,
  ] = await Promise.all([
    ctx.supabase
      .schema("clinic")
      .from("anamnesis_forms")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId),
    ctx.supabase
      .schema("clinic")
      .from("anamnesis_submissions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId),
    ctx.supabase
      .schema("clinic")
      .from("evolutions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId),
    ctx.supabase
      .schema("clinic")
      .from("budgets")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId),
    ctx.supabase
      .schema("clinic")
      .from("client_procedure_purchases")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId),
    ctx.supabase
      .schema("clinic")
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId),
    ctx.supabase
      .schema("clinic")
      .from("documents")
      .select("id, title, created_at")
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .eq("kind", SYSTEM_DOCUMENT_KINDS.clientHistoryExport)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const counts = {
    anamnesis:
      (anamnesisFormsRes.count ?? 0) + (anamnesisSubmissionsRes.count ?? 0),
    evolution: evolutionsRes.count ?? 0,
    budgets: budgetsRes.count ?? 0,
    contracts: purchasesRes.count ?? 0,
    photos: photosRes.count ?? 0,
  };

  const brandingResult = await listBrandingProfiles();
  const brandingProfiles = brandingResult.ok
    ? brandingResult.profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        is_default: profile.is_default,
      }))
    : [];

  const previousExports = (exportsRes.data ?? []).map((doc) => ({
    id: doc.id,
    title: doc.title,
    createdAt: doc.created_at,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Reúna em um único PDF toda a jornada da paciente com a clínica: cadastro,
        anamneses, evoluções, orçamentos, contratos e fotos clínicas. Use o
        preset completo para documentação integral ou filtre por período e
        seções específicas.
      </p>
      <PacienteHistoricoPanel
        clientId={clientId}
        clientName={ctx.client.full_name}
        brandingProfiles={brandingProfiles}
        counts={counts}
        previousExports={previousExports}
      />
    </div>
  );
}
