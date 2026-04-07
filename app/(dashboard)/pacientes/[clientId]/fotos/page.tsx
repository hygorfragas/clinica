import { notFound } from "next/navigation";
import {
  PacienteFotosPanel,
  type FotoComUrl,
} from "@/components/clients/paciente-fotos-panel";
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
    .select("id, caption, taken_at, created_at, storage_key")
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-danger">Não foi possível carregar as fotos.</p>
    );
  }

  const fotos: FotoComUrl[] = await Promise.all(
    (rows ?? []).map(async (p) => {
      const { data } = await ctx.supabase.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(p.storage_key, 3600);
      return {
        id: p.id,
        caption: p.caption,
        taken_at: p.taken_at,
        created_at: p.created_at,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Fotos para evolução e documentação visual. Arquivos privados; links de
        visualização expiram em até 1 hora.
      </p>
      <PacienteFotosPanel clientId={clientId} fotos={fotos} />
    </div>
  );
}
