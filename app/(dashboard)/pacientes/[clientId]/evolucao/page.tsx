import { notFound } from "next/navigation";
import { PacienteEvolucaoPanel } from "@/components/clients/paciente-evolucao-panel";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteEvolucaoPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const [evosRes, procRes, purchaseRes, photoRes] = await Promise.all([
    ctx.supabase
      .schema("clinic")
      .from("evolutions")
      .select(
        "id, body, created_at, procedure_id, purchase_id, session_number, appointment_id",
      )
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .schema("clinic")
      .from("procedures")
      .select("id, name")
      .eq("tenant_id", ctx.tenantId)
      .order("name", { ascending: true }),
    ctx.supabase
      .schema("clinic")
      .from("client_procedure_purchases")
      .select("id, title, purchased_at, procedure_id")
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .order("purchased_at", { ascending: false }),
    ctx.supabase
      .schema("clinic")
      .from("photos")
      .select("id, storage_key, caption, taken_at, evolution_id")
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .not("evolution_id", "is", null),
  ]);

  if (evosRes.error || procRes.error || purchaseRes.error || photoRes.error) {
    return (
      <p className="text-sm text-danger">
        Não foi possível carregar a evolução clínica.
      </p>
    );
  }

  const photosByEvolution = new Map<
    string,
    { id: string; url: string | null; caption: string | null; taken_at: string | null }[]
  >();

  for (const p of photoRes.data ?? []) {
    if (!p.evolution_id) continue;
    const { data: signed } = await ctx.supabase.storage
      .from(CLINICAL_BUCKET)
      .createSignedUrl(p.storage_key, 3600);
    const arr = photosByEvolution.get(p.evolution_id) ?? [];
    arr.push({
      id: p.id,
      url: signed?.signedUrl ?? null,
      caption: p.caption,
      taken_at: p.taken_at,
    });
    photosByEvolution.set(p.evolution_id, arr);
  }

  const procNameById = new Map((procRes.data ?? []).map((p) => [p.id, p.name]));

  const entries = (evosRes.data ?? []).map((e) => ({
    id: e.id,
    body: e.body,
    created_at: e.created_at,
    procedure_id: e.procedure_id,
    procedure_name: e.procedure_id ? procNameById.get(e.procedure_id) ?? null : null,
    purchase_id: e.purchase_id,
    session_number: e.session_number,
    photos: photosByEvolution.get(e.id) ?? [],
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Registro cronológico de sessões, com vínculo a procedimentos e anexos de
        fotos.
      </p>
      <PacienteEvolucaoPanel
        clientId={clientId}
        entries={entries}
        procedures={procRes.data ?? []}
        purchases={(purchaseRes.data ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          purchased_at: p.purchased_at,
          procedure_id: p.procedure_id,
        }))}
      />
    </div>
  );
}
