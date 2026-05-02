"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Trash2, Upload, Copy, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentPreviewA4 } from "@/components/configuracoes/document-preview-a4";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import {
  createBrandingProfile,
  deleteBrandingAsset,
  deleteBrandingProfile,
  duplicateBrandingProfile,
  setDefaultBrandingProfile,
  updateBrandingProfile,
  uploadBrandingAsset,
  type BrandingAssetWithUrl,
  type BrandingProfileRow,
} from "@/lib/branding/actions";
import {
  BRANDING_REQUIREMENTS,
  LOGO_POSITIONS,
  type BrandingKind,
  type LogoPosition,
} from "@/lib/branding/schemas";

type Props = {
  initialAssets: BrandingAssetWithUrl[];
  initialProfiles: BrandingProfileRow[];
};

type ProfileDraft = {
  id: string | null;
  name: string;
  showHeader: boolean;
  showFooter: boolean;
  showLogo: boolean;
  headerAssetId: string | null;
  footerAssetId: string | null;
  logoAssetId: string | null;
  logoPosition: LogoPosition;
  logoScalePct: number;
  headerHeightMm: number;
  footerHeightMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
};

function emptyDraft(): ProfileDraft {
  return {
    id: null,
    name: "Novo perfil",
    showHeader: true,
    showFooter: true,
    showLogo: false,
    headerAssetId: null,
    footerAssetId: null,
    logoAssetId: null,
    logoPosition: "top-left",
    logoScalePct: 30,
    headerHeightMm: 30,
    footerHeightMm: 20,
    marginTopMm: 15,
    marginRightMm: 15,
    marginBottomMm: 15,
    marginLeftMm: 15,
  };
}

function draftFromProfile(profile: BrandingProfileRow): ProfileDraft {
  return {
    id: profile.id,
    name: profile.name,
    showHeader: profile.show_header,
    showFooter: profile.show_footer,
    showLogo: profile.show_logo,
    headerAssetId: profile.header_asset_id,
    footerAssetId: profile.footer_asset_id,
    logoAssetId: profile.logo_asset_id,
    logoPosition: profile.logo_position,
    logoScalePct: profile.logo_scale_pct,
    headerHeightMm: profile.header_height_mm,
    footerHeightMm: profile.footer_height_mm,
    marginTopMm: profile.margin_top_mm,
    marginRightMm: profile.margin_right_mm,
    marginBottomMm: profile.margin_bottom_mm,
    marginLeftMm: profile.margin_left_mm,
  };
}

export function DocumentBrandingManager({ initialAssets, initialProfiles }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );
  const { confirm, element: confirmDialog } = useConfirmDialog();
  const [draft, setDraft] = useState<ProfileDraft>(
    initialProfiles[0] ? draftFromProfile(initialProfiles[0]) : emptyDraft(),
  );

  const assetsByKind = useMemo(() => {
    return {
      header: initialAssets.filter((asset) => asset.kind === "header"),
      footer: initialAssets.filter((asset) => asset.kind === "footer"),
      logo: initialAssets.filter((asset) => asset.kind === "logo"),
    };
  }, [initialAssets]);

  const assetById = useMemo(() => {
    const map = new Map<string, BrandingAssetWithUrl>();
    for (const asset of initialAssets) map.set(asset.id, asset);
    return map;
  }, [initialAssets]);

  function updateDraft(patch: Partial<ProfileDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function notifyOk(text: string) {
    setMessage({ tone: "ok", text });
    notifySuccess(text);
  }
  function notifyErr(text: string) {
    setMessage({ tone: "err", text });
    notifyError(null, text);
  }

  function selectProfile(profile: BrandingProfileRow) {
    setDraft(draftFromProfile(profile));
    setMessage(null);
  }

  function startNewProfile() {
    setDraft(emptyDraft());
    setMessage(null);
  }

  function saveProfile() {
    setMessage(null);
    if (draft.id) {
      startTransition(async () => {
        const result = await updateBrandingProfile({
          id: draft.id!,
          name: draft.name,
          showHeader: draft.showHeader,
          showFooter: draft.showFooter,
          showLogo: draft.showLogo,
          headerAssetId: draft.headerAssetId,
          footerAssetId: draft.footerAssetId,
          logoAssetId: draft.logoAssetId,
          logoPosition: draft.logoPosition,
          logoScalePct: draft.logoScalePct,
          headerHeightMm: draft.headerHeightMm,
          footerHeightMm: draft.footerHeightMm,
          marginTopMm: draft.marginTopMm,
          marginRightMm: draft.marginRightMm,
          marginBottomMm: draft.marginBottomMm,
          marginLeftMm: draft.marginLeftMm,
        });
        if (!result.ok) return notifyErr(result.error);
        notifyOk("Perfil atualizado.");
        router.refresh();
      });
      return;
    }
    startTransition(async () => {
      const result = await createBrandingProfile({
        name: draft.name,
        showHeader: draft.showHeader,
        showFooter: draft.showFooter,
        showLogo: draft.showLogo,
        headerAssetId: draft.headerAssetId,
        footerAssetId: draft.footerAssetId,
        logoAssetId: draft.logoAssetId,
        logoPosition: draft.logoPosition,
        logoScalePct: draft.logoScalePct,
        headerHeightMm: draft.headerHeightMm,
        footerHeightMm: draft.footerHeightMm,
        marginTopMm: draft.marginTopMm,
        marginRightMm: draft.marginRightMm,
        marginBottomMm: draft.marginBottomMm,
        marginLeftMm: draft.marginLeftMm,
      });
      if (!result.ok) return notifyErr(result.error);
      notifyOk("Perfil criado.");
      router.refresh();
    });
  }

  function onSetDefault(profileId: string) {
    startTransition(async () => {
      const result = await setDefaultBrandingProfile(profileId);
      if (!result.ok) return notifyErr(result.error);
      notifyOk("Perfil marcado como padrão.");
      router.refresh();
    });
  }

  function onDuplicate(profileId: string) {
    startTransition(async () => {
      const result = await duplicateBrandingProfile(profileId);
      if (!result.ok) return notifyErr(result.error);
      notifyOk("Perfil duplicado.");
      router.refresh();
    });
  }

  function onDeleteProfile(profileId: string) {
    confirm({
      title: "Remover perfil de papel timbrado",
      description: "O perfil será removido, mas as imagens enviadas continuam disponíveis na biblioteca.",
      confirmLabel: "Remover",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            const result = await deleteBrandingProfile(profileId);
            if (!result.ok) {
              notifyErr(result.error);
              reject(new Error(result.error));
              return;
            }
            notifyOk("Perfil removido.");
            if (draft.id === profileId) setDraft(emptyDraft());
            router.refresh();
            resolve();
          });
        }),
    });
  }

  async function onUploadAsset(kind: BrandingKind, file: File, label: string) {
    setMessage(null);
    const dims = await readImageDimensions(file);
    if (!dims) {
      notifyErr("Não foi possível ler as dimensões da imagem.");
      return;
    }
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("label", label);
    fd.append("widthPx", String(dims.width));
    fd.append("heightPx", String(dims.height));
    fd.append("file", file);
    startTransition(async () => {
      const result = await uploadBrandingAsset(fd);
      if (!result.ok) return notifyErr(result.error);
      notifyOk("Imagem enviada.");
      router.refresh();
    });
  }

  function onDeleteAsset(assetId: string) {
    confirm({
      title: "Remover imagem",
      description: "Perfis que usam esta imagem deixarão de exibi-la até que você escolha outra.",
      confirmLabel: "Remover",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            const result = await deleteBrandingAsset(assetId);
            if (!result.ok) {
              notifyErr(result.error);
              reject(new Error(result.error));
              return;
            }
            notifyOk("Imagem removida.");
            router.refresh();
            resolve();
          });
        }),
    });
  }

  const previewData = useMemo(() => {
    const header = draft.headerAssetId ? assetById.get(draft.headerAssetId) : null;
    const footer = draft.footerAssetId ? assetById.get(draft.footerAssetId) : null;
    const logo = draft.logoAssetId ? assetById.get(draft.logoAssetId) : null;
    const logoAspect =
      logo?.width_px && logo?.height_px ? logo.width_px / logo.height_px : null;
    return {
      showHeader: draft.showHeader,
      showFooter: draft.showFooter,
      showLogo: draft.showLogo,
      headerUrl: header?.signedUrl ?? null,
      footerUrl: footer?.signedUrl ?? null,
      logoUrl: logo?.signedUrl ?? null,
      logoAspect,
      logoPosition: draft.logoPosition,
      logoScalePct: draft.logoScalePct,
      headerHeightMm: draft.headerHeightMm,
      footerHeightMm: draft.footerHeightMm,
      marginTopMm: draft.marginTopMm,
      marginRightMm: draft.marginRightMm,
      marginBottomMm: draft.marginBottomMm,
      marginLeftMm: draft.marginLeftMm,
    };
  }, [draft, assetById]);

  return (
    <div className="space-y-8">
      {confirmDialog}
      {message ? (
        <p
          role={message.tone === "err" ? "alert" : "status"}
          className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
            message.tone === "err"
              ? "bg-danger/10 text-danger ring-danger/25"
              : "bg-brand/12 text-brand ring-brand/25"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Imagens de marca</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Envie as peças que poderão ser combinadas em perfis de documento.
              Respeitar o tamanho recomendado garante uma aplicação nítida no PDF.
            </p>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {(["header", "footer", "logo"] as const).map((kind) => (
            <BrandingKindPanel
              key={kind}
              kind={kind}
              assets={assetsByKind[kind]}
              onUpload={onUploadAsset}
              onDelete={onDeleteAsset}
              pending={pending}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Perfis de documento</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Combine as imagens para montar layouts diferentes. O perfil marcado
              como padrão é aplicado automaticamente quando você exporta o PDF.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={startNewProfile}
            disabled={pending}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Novo perfil
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr,1.3fr]">
          <div className="space-y-4">
            {initialProfiles.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-muted/20 p-6 text-sm text-ink-muted">
                Você ainda não criou nenhum perfil. Configure abaixo e salve
                para o primeiro ser marcado automaticamente como padrão.
              </p>
            ) : (
              <ul className="space-y-2">
                {initialProfiles.map((profile) => {
                  const isActive = draft.id === profile.id;
                  return (
                    <li key={profile.id}>
                      <div
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 ${
                          isActive
                            ? "border-brand/30 bg-brand/5"
                            : "border-line/70 bg-muted/20"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex-1 text-left"
                          onClick={() => selectProfile(profile)}
                        >
                          <p className="text-sm font-semibold text-ink">
                            {profile.name}
                            {profile.is_default ? (
                              <span className="ml-2 rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand ring-1 ring-brand/25">
                                padrão
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {summarizeProfile(profile)}
                          </p>
                        </button>
                        <div className="flex items-center gap-1">
                          {!profile.is_default ? (
                            <button
                              type="button"
                              title="Tornar padrão"
                              onClick={() => onSetDefault(profile.id)}
                              disabled={pending}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-brand/10 hover:text-brand disabled:opacity-40"
                            >
                              <Star className="h-4 w-4" aria-hidden />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            title="Duplicar"
                            onClick={() => onDuplicate(profile.id)}
                            disabled={pending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-brand/10 hover:text-brand disabled:opacity-40"
                          >
                            <Copy className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            title="Remover"
                            onClick={() => onDeleteProfile(profile.id)}
                            disabled={pending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <ProfileForm
              draft={draft}
              updateDraft={updateDraft}
              assets={initialAssets}
              onSave={saveProfile}
              pending={pending}
            />
          </div>

          <div className="rounded-2xl bg-muted/30 p-5 ring-1 ring-line/60">
            <DocumentPreviewA4 data={previewData} />
          </div>
        </div>
      </section>
    </div>
  );
}

function summarizeProfile(profile: BrandingProfileRow): string {
  const parts: string[] = [];
  if (profile.show_header) parts.push("header");
  if (profile.show_footer) parts.push("rodapé");
  if (profile.show_logo) parts.push("logo");
  if (parts.length === 0) parts.push("sem branding");
  return parts.join(" · ");
}

function BrandingKindPanel({
  kind,
  assets,
  onUpload,
  onDelete,
  pending,
}: {
  kind: BrandingKind;
  assets: BrandingAssetWithUrl[];
  onUpload: (kind: BrandingKind, file: File, label: string) => Promise<void> | void;
  onDelete: (assetId: string) => void;
  pending: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const spec = BRANDING_REQUIREMENTS[kind];

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    onUpload(kind, file, label.trim());
    setLabel("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const kindLabel =
    kind === "header" ? "Header (topo)" : kind === "footer" ? "Rodapé" : "Logo";

  return (
    <div className="rounded-2xl border border-line/70 bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">{kindLabel}</h3>
        <p className="mt-1 text-xs text-ink-muted">{spec.description}</p>
        <p className="mt-1 text-[11px] text-ink-subtle">
          Recomendado: {spec.recommendedLabel}
        </p>
      </div>

      <form onSubmit={submit} className="mt-3 space-y-2">
        <Input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          disabled={pending}
        />
        <Input
          placeholder="Rótulo (ex.: logo verde)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={pending}
        />
        <Button type="submit" size="sm" variant="secondary" className="gap-1.5" disabled={pending}>
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Enviar
        </Button>
      </form>

      {assets.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center gap-3 rounded-xl bg-surface p-2 ring-1 ring-line/60"
            >
              <div className="h-10 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {asset.signedUrl ? (
                  <img
                    src={asset.signedUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">
                  {asset.label ?? `${kind}-${asset.id.slice(0, 6)}`}
                </p>
                <p className="truncate text-[10px] text-ink-subtle">
                  {asset.width_px}×{asset.height_px}px
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-danger/10 hover:text-danger"
                onClick={() => onDelete(asset.id)}
                disabled={pending}
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-ink-subtle">Nenhuma imagem enviada ainda.</p>
      )}
    </div>
  );
}

function ProfileForm({
  draft,
  updateDraft,
  assets,
  onSave,
  pending,
}: {
  draft: ProfileDraft;
  updateDraft: (patch: Partial<ProfileDraft>) => void;
  assets: BrandingAssetWithUrl[];
  onSave: () => void;
  pending: boolean;
}) {
  const headerOptions = assets.filter((a) => a.kind === "header");
  const footerOptions = assets.filter((a) => a.kind === "footer");
  const logoOptions = assets.filter((a) => a.kind === "logo");

  return (
    <div className="space-y-4 rounded-2xl border border-line/70 bg-muted/10 p-4">
      <div className="space-y-2">
        <Label>Nome do perfil</Label>
        <Input
          value={draft.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
          placeholder="Ex.: Papel timbrado completo"
          disabled={pending}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ToggleRow
          label="Header"
          checked={draft.showHeader}
          onChange={(value) => updateDraft({ showHeader: value })}
        />
        <ToggleRow
          label="Rodapé"
          checked={draft.showFooter}
          onChange={(value) => updateDraft({ showFooter: value })}
        />
        <ToggleRow
          label="Logo"
          checked={draft.showLogo}
          onChange={(value) => updateDraft({ showLogo: value })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <AssetSelect
          label="Imagem de header"
          disabled={!draft.showHeader || pending}
          value={draft.headerAssetId ?? ""}
          onChange={(value) => updateDraft({ headerAssetId: value || null })}
          options={headerOptions}
        />
        <AssetSelect
          label="Imagem de rodapé"
          disabled={!draft.showFooter || pending}
          value={draft.footerAssetId ?? ""}
          onChange={(value) => updateDraft({ footerAssetId: value || null })}
          options={footerOptions}
        />
        <AssetSelect
          label="Imagem do logo"
          disabled={!draft.showLogo || pending}
          value={draft.logoAssetId ?? ""}
          onChange={(value) => updateDraft({ logoAssetId: value || null })}
          options={logoOptions}
        />
        <div className="space-y-2">
          <Label>Posição do logo</Label>
          <select
            className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
            value={draft.logoPosition}
            onChange={(e) =>
              updateDraft({ logoPosition: e.target.value as LogoPosition })
            }
            disabled={!draft.showLogo || pending}
          >
            {LOGO_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {humanizePosition(pos)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Escala do logo ({draft.logoScalePct}%)</Label>
        <input
          type="range"
          min={10}
          max={100}
          step={2}
          value={draft.logoScalePct}
          onChange={(e) =>
            updateDraft({ logoScalePct: Number.parseInt(e.target.value, 10) })
          }
          disabled={!draft.showLogo || pending}
          className="w-full accent-brand"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NumberField
          label="Altura do header (mm)"
          value={draft.headerHeightMm}
          onChange={(value) => updateDraft({ headerHeightMm: value })}
          min={5}
          max={80}
          disabled={pending}
        />
        <NumberField
          label="Altura do rodapé (mm)"
          value={draft.footerHeightMm}
          onChange={(value) => updateDraft({ footerHeightMm: value })}
          min={5}
          max={60}
          disabled={pending}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <NumberField
          label="Margem topo"
          value={draft.marginTopMm}
          onChange={(value) => updateDraft({ marginTopMm: value })}
          min={0}
          max={60}
          disabled={pending}
        />
        <NumberField
          label="Margem direita"
          value={draft.marginRightMm}
          onChange={(value) => updateDraft({ marginRightMm: value })}
          min={0}
          max={60}
          disabled={pending}
        />
        <NumberField
          label="Margem base"
          value={draft.marginBottomMm}
          onChange={(value) => updateDraft({ marginBottomMm: value })}
          min={0}
          max={60}
          disabled={pending}
        />
        <NumberField
          label="Margem esquerda"
          value={draft.marginLeftMm}
          onChange={(value) => updateDraft({ marginLeftMm: value })}
          min={0}
          max={60}
          disabled={pending}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="button" onClick={onSave} disabled={pending}>
          {draft.id ? "Salvar alterações" : "Criar perfil"}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 ring-1 ring-line/60">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-brand"
      />
    </label>
  );
}

function AssetSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: BrandingAssetWithUrl[];
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Selecione uma imagem…</option>
        {options.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.label ?? asset.id.slice(0, 6)} · {asset.width_px}×{asset.height_px}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const parsed = Number.parseInt(e.target.value || "0", 10);
          if (Number.isFinite(parsed)) {
            onChange(Math.max(min, Math.min(max, parsed)));
          }
        }}
        disabled={disabled}
      />
    </div>
  );
}

function humanizePosition(position: LogoPosition): string {
  switch (position) {
    case "top-left":
      return "Topo à esquerda";
    case "top-center":
      return "Topo centralizado";
    case "top-right":
      return "Topo à direita";
    case "below-header-left":
      return "Abaixo do header, à esquerda";
    case "below-header-center":
      return "Abaixo do header, centralizado";
    default:
      return position;
  }
}

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}
