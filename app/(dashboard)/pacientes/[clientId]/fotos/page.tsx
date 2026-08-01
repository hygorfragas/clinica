import { notFound } from "next/navigation";
import {
  PacienteFotosBiblioteca,
  type FotoBibliotecaItem,
} from "@/components/clients/paciente-fotos-biblioteca";
import { getPhotoDisplayAt } from "@/lib/clinical/photo-display";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteFotosPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) {
    notFound();
  }

  const photosRes = await ctx.supabase
    .schema("clinic")
    .from("photos")
    .select("id, caption, captured_at, created_at")
    .eq("client_id", clientId)
    .eq("tenant_id", ctx.tenantId);

  if (photosRes.error) {
    return (
      <p className="text-sm text-danger">Não foi possível carregar as fotos.</p>
    );
  }

  const list = [...(photosRes.data ?? [])].sort((a, b) => {
    const da = getPhotoDisplayAt(a.captured_at, a.created_at);
    const db = getPhotoDisplayAt(b.captured_at, b.created_at);
    return db.localeCompare(da);
  });

  const fotos: FotoBibliotecaItem[] = list.map((p) => ({
    id: p.id,
    caption: p.caption,
    captured_at: p.captured_at,
    created_at: p.created_at,
  }));

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
          Biblioteca de fotos
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          Todas as imagens do prontuário — enviadas aqui, na evolução ou no
          cadastro — em um só lugar. Visualize, envie novas fotos com data e
          hora, ou remova registros que não devem mais aparecer.
        </p>
      </header>
      <PacienteFotosBiblioteca clientId={clientId} fotos={fotos} />
    </div>
  );
}
