import { notFound } from "next/navigation";
import {
  PacienteDocumentosPanel,
  type AssinaturaComUrl,
  type DocComUrl,
} from "@/components/clients/paciente-documentos-panel";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteDocumentosPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) {
    notFound();
  }

  const [docsRes, sigsRes] = await Promise.all([
    ctx.supabase
      .schema("clinic")
      .from("documents")
      .select("id, kind, title, mime_type, created_at, storage_key")
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .schema("clinic")
      .from("signatures")
      .select("id, signer_name, signed_at, document_id, image_storage_key")
      .eq("client_id", clientId)
      .eq("tenant_id", ctx.tenantId)
      .order("signed_at", { ascending: false }),
  ]);

  if (docsRes.error || sigsRes.error) {
    return (
      <p className="text-sm text-danger">
        Não foi possível carregar documentos ou assinaturas.
      </p>
    );
  }

  const documentos: DocComUrl[] = await Promise.all(
    (docsRes.data ?? []).map(async (d) => {
      const { data } = await ctx.supabase.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(d.storage_key, 3600);
      return {
        id: d.id,
        kind: d.kind,
        title: d.title,
        mime_type: d.mime_type,
        created_at: d.created_at,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  const assinaturas: AssinaturaComUrl[] = await Promise.all(
    (sigsRes.data ?? []).map(async (s) => {
      const { data } = await ctx.supabase.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(s.image_storage_key, 3600);
      return {
        id: s.id,
        signer_name: s.signer_name,
        signed_at: s.signed_at,
        document_id: s.document_id,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Contratos, termos de procedimento e registro de assinaturas (imagem).
        Em produção, valide fluxo jurídico com o CRF/CRM da profissional.
      </p>
      <PacienteDocumentosPanel
        clientId={clientId}
        documentos={documentos}
        assinaturas={assinaturas}
      />
    </div>
  );
}
