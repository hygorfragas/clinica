import { notFound } from "next/navigation";
import {
  PacienteDocumentosPanel,
  type AssinaturaComUrl,
  type DocComUrl,
} from "@/components/clients/paciente-documentos-panel";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import { loadPacienteClinicContext } from "@/lib/clients/paciente-context";
import { sanitizeContractHtml } from "@/lib/contracts/sanitize-html";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PacienteAnexosPage({ params }: PageProps) {
  const { clientId } = await params;
  const ctx = await loadPacienteClinicContext(clientId);
  if (!ctx) notFound();

  const [docsRes, sigsRes] = await Promise.all([
    ctx.supabase
      .schema("clinic")
      .from("documents")
      .select("id, kind, title, mime_type, created_at, storage_key, body_html")
      .eq("tenant_id", ctx.tenantId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .schema("clinic")
      .from("signatures")
      .select("id, signer_name, signed_at, document_id, image_storage_key")
      .eq("tenant_id", ctx.tenantId)
      .eq("client_id", clientId)
      .order("signed_at", { ascending: false }),
  ]);

  if (docsRes.error || sigsRes.error) {
    return <p className="text-sm text-danger">Não foi possível carregar os anexos.</p>;
  }

  const documentos: DocComUrl[] = await Promise.all(
    (docsRes.data ?? []).map(async (doc) => {
      let url: string | null = null;
      if (doc.storage_key) {
        const { data } = await ctx.supabase.storage
          .from(CLINICAL_BUCKET)
          .createSignedUrl(doc.storage_key, 3600);
        url = data?.signedUrl ?? null;
      }
      return {
        id: doc.id,
        kind: doc.kind,
        title: doc.title,
        mime_type: doc.mime_type,
        created_at: doc.created_at,
        url,
        body_html: doc.body_html ? sanitizeContractHtml(doc.body_html) : null,
      };
    }),
  );

  const assinaturas: AssinaturaComUrl[] = await Promise.all(
    (sigsRes.data ?? []).map(async (signature) => {
      const { data } = await ctx.supabase.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(signature.image_storage_key, 3600);
      return {
        id: signature.id,
        signer_name: signature.signer_name,
        signed_at: signature.signed_at,
        document_id: signature.document_id,
        url: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
          Anexos da paciente
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          Biblioteca central de arquivos desta ficha. Cada upload fica registrado
          automaticamente com data e hora e pode incluir PDFs, imagens, planilhas,
          documentos de texto e arquivos compactados.
        </p>
      </header>

      <PacienteDocumentosPanel
        clientId={clientId}
        documentos={documentos}
        assinaturas={assinaturas}
      />
    </div>
  );
}
