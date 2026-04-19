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

  const [photosRes, purchasesRes] = await Promise.all([
    ctx.supabase
      .schema("clinic")
      .from("photos")
      .select(
        "id, caption, taken_at, created_at, storage_key, body_region, capture_angle, purchase_id, comparison_role",
      )
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .schema("clinic")
      .from("client_procedure_purchases")
      .select("id, title, purchased_at")
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .order("purchased_at", { ascending: false }),
  ]);

  if (photosRes.error || purchasesRes.error) {
    return (
      <p className="text-sm text-danger">Não foi possível carregar as fotos.</p>
    );
  }

  const list = photosRes.data ?? [];
  const purchaseOptions = purchasesRes.data ?? [];
  const purchaseMap = new Map(purchaseOptions.map((p) => [p.id, p]));

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
      const pur = p.purchase_id ? purchaseMap.get(p.purchase_id) : undefined;
      return {
        id: p.id,
        caption: p.caption,
        taken_at: p.taken_at,
        created_at: p.created_at,
        body_region: p.body_region,
        capture_angle: p.capture_angle,
        purchase_id: p.purchase_id,
        comparison_role: p.comparison_role,
        purchase_title: pur?.title ?? null,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
          Fotos clínicas e comparativos
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          Envie imagens com região e ângulo (rosto para o boneco digital). Para
          cada <strong className="font-medium text-ink">procedimento</strong>{" "}
          registrado na aba Procedimentos, você pode vincular o envio e marcar{" "}
          <strong className="font-medium text-ink">antes</strong> ou{" "}
          <strong className="font-medium text-ink">depois</strong>.
        </p>
      </header>
      <PacienteFotosPanel
        clientId={clientId}
        fotos={fotos}
        missingFaceBonecoAngles={missingFaceBonecoAnglesList}
        purchaseOptions={purchaseOptions}
      />
    </div>
  );
}
