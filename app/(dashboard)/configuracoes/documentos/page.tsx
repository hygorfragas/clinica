import { DocumentBrandingManager } from "@/components/configuracoes/document-branding-manager";
import { listBrandingAssets, listBrandingProfiles } from "@/lib/branding/actions";
import { requireClinicAdminPage } from "@/lib/auth/page-guards";

export default async function ConfigDocumentosPage() {
  await requireClinicAdminPage();

  const [assetsResult, profilesResult] = await Promise.all([
    listBrandingAssets(),
    listBrandingProfiles(),
  ]);

  const assets = assetsResult.ok ? assetsResult.assets : [];
  const profiles = profilesResult.ok ? profilesResult.profiles : [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          Documentos — branding e layout
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Envie as imagens que aparecerão nos documentos gerados pelo sistema
          (header, rodapé e logo da clínica) e monte perfis nomeados com
          layouts diferentes. O orçamento passa a aplicar o perfil escolhido no
          momento da exportação em PDF.
        </p>
      </header>

      <DocumentBrandingManager
        initialAssets={assets}
        initialProfiles={profiles}
      />
    </div>
  );
}
