import { notFound } from "next/navigation";
import {
  PacienteFotosPanel,
  type FotoComUrl,
} from "@/components/clients/paciente-fotos-panel";
import {
  faceAngleCoverage,
  missingFaceBonecoAngles,
} from "@/lib/clinical/body-regions";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteFotosPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) {
    notFound();
  }

  const { data: rows, error } = await ctx.supabase
    .schema("clinic")
    .from("photos")
    .select(
      "id, caption, taken_at, created_at, storage_key, body_region, capture_angle",
    )
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-danger">Não foi possível carregar as fotos.</p>
    );
  }

  const list = rows ?? [];
  const faceAngles = list
    .filter((p) => p.body_region === "face")
    .map((p) => p.capture_angle);
  const missingFaceBonecoAnglesList = missingFaceBonecoAngles(
    faceAngleCoverage(faceAngles),
  );

  const fotos: FotoComUrl[] = await Promise.all(
    list.map(async (p) => {
      const { data } = await ctx.supabase.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(p.storage_key, 3600);
      return {
        id: p.id,
        caption: p.caption,
        taken_at: p.taken_at,
        created_at: p.created_at,
        body_region: p.body_region,
        capture_angle: p.capture_angle,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Registre até 15 fotos por envio, com região do procedimento. Para{" "}
        <strong className="font-medium text-ink">rosto</strong>, classifique o
        ângulo (frente, perfis, cima, baixo) para compor a base do boneco digital.
        Outras regiões: fotos livres, sem obrigação de ângulos.
      </p>
      <PacienteFotosPanel
        clientId={clientId}
        fotos={fotos}
        missingFaceBonecoAngles={missingFaceBonecoAnglesList}
      />
    </div>
  );
}
