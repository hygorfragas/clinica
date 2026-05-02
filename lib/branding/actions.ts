"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { CLINICAL_BUCKET, safeStorageFileName } from "@/lib/clinical/storage";
import {
  requireClinicalTenantContext,
  type ClinicSupabaseClient,
} from "@/lib/clients/clinical-tenant-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  assertBrandingImageDimensions,
  assertBrandingMime,
  brandingFileExtension,
  createBrandingProfileSchema,
  MAX_BRANDING_BYTES,
  updateBrandingProfileSchema,
  uploadBrandingAssetSchema,
  type BrandingKind,
  type CreateBrandingProfileInput,
  type UpdateBrandingProfileInput,
} from "@/lib/branding/schemas";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

export type BrandingAssetRow = {
  id: string;
  tenant_id: string;
  kind: BrandingKind;
  label: string | null;
  storage_key: string;
  mime_type: string;
  width_px: number | null;
  height_px: number | null;
  file_size: number | null;
  created_at: string;
};

export type BrandingAssetWithUrl = BrandingAssetRow & {
  signedUrl: string | null;
};

export type BrandingProfileRow = {
  id: string;
  tenant_id: string;
  name: string;
  is_default: boolean;
  show_header: boolean;
  show_footer: boolean;
  show_logo: boolean;
  header_asset_id: string | null;
  footer_asset_id: string | null;
  logo_asset_id: string | null;
  logo_position:
    | "top-left"
    | "top-center"
    | "top-right"
    | "below-header-left"
    | "below-header-center";
  logo_scale_pct: number;
  header_height_mm: number;
  footer_height_mm: number;
  margin_top_mm: number;
  margin_right_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  created_at: string;
  updated_at: string;
};

function buildBrandingStoragePath(params: {
  tenantId: string;
  kind: BrandingKind;
  originalFileName: string;
  mime: string;
}): string {
  const ext = brandingFileExtension(params.mime);
  const safeBase = safeStorageFileName(
    params.originalFileName.replace(/\.[^.]+$/, ""),
  );
  return `${params.tenantId}/branding/${params.kind}/${randomUUID()}-${safeBase}.${ext}`;
}

async function signAssetUrls(
  supabase: ClinicSupabaseClient,
  rows: BrandingAssetRow[],
  ttlSeconds = 60 * 60,
): Promise<BrandingAssetWithUrl[]> {
  return Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.storage
        .from(CLINICAL_BUCKET)
        .createSignedUrl(row.storage_key, ttlSeconds);
      return { ...row, signedUrl: data?.signedUrl ?? null };
    }),
  );
}

export async function listBrandingAssets(): Promise<
  Ok<{ assets: BrandingAssetWithUrl[] }> | Err
> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("branding_assets")
    .select(
      "id, tenant_id, kind, label, storage_key, mime_type, width_px, height_px, file_size, created_at",
    )
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message ?? "Falha ao listar imagens de marca." };
  }

  const assets = await signAssetUrls(ctx.supabase, (data ?? []) as BrandingAssetRow[]);
  return { ok: true, assets };
}

export async function listBrandingProfiles(): Promise<
  Ok<{ profiles: BrandingProfileRow[] }> | Err
> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message ?? "Falha ao listar perfis." };
  }
  return { ok: true, profiles: (data ?? []) as BrandingProfileRow[] };
}

/** Sobe uma imagem de branding. Espera FormData com campos: kind, label, widthPx, heightPx, file. */
export async function uploadBrandingAsset(
  formData: FormData,
): Promise<Ok<{ id: string }> | Err> {
  try {
    const ctx = await requireClinicalTenantContext();
    if (!ctx.ok) return ctx;

    const file = formData.get("file");
    if (!(file instanceof Blob) || file.size === 0) {
      return { ok: false, error: "Selecione um arquivo de imagem." };
    }
    if (file.size > MAX_BRANDING_BYTES) {
      return { ok: false, error: "Arquivo muito grande (máx. 4 MB)." };
    }
    const mimeErr = assertBrandingMime(file.type);
    if (mimeErr) return { ok: false, error: mimeErr };
    const fileName = (file as File).name ?? "arquivo";

    const rawWidth = Number(formData.get("widthPx"));
    const rawHeight = Number(formData.get("heightPx"));
    const rawKind = formData.get("kind");
    const rawLabel = formData.get("label");

    const parsed = uploadBrandingAssetSchema.safeParse({
      kind: typeof rawKind === "string" ? rawKind : "",
      label:
        typeof rawLabel === "string" && rawLabel.trim().length > 0
          ? rawLabel.trim()
          : null,
      widthPx: Number.isFinite(rawWidth) ? Math.round(rawWidth) : 0,
      heightPx: Number.isFinite(rawHeight) ? Math.round(rawHeight) : 0,
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }

    const { kind, label, widthPx, heightPx } = parsed.data;
    const dimErr = assertBrandingImageDimensions(kind, widthPx, heightPx);
    if (dimErr) return { ok: false, error: dimErr };

    const path = buildBrandingStoragePath({
      tenantId: ctx.tenantId,
      kind,
      originalFileName: fileName,
      mime: file.type,
    });

    // Service role para storage: o tenant já foi validado por
    // requireClinicalTenantContext, e isso evita falhas intermitentes de
    // RLS no upload via SSR client.
    let storageClient: ReturnType<typeof createServiceRoleClient>;
    try {
      storageClient = createServiceRoleClient();
    } catch (e) {
      console.error("[uploadBrandingAsset] service role indisponível:", e);
      return {
        ok: false,
        error:
          "Configuração do servidor incompleta — defina SUPABASE_SERVICE_ROLE_KEY no .env.",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await storageClient.storage
      .from(CLINICAL_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });
    if (upErr) {
      console.error("[uploadBrandingAsset] storage upload:", upErr);
      return { ok: false, error: upErr.message ?? "Falha no upload." };
    }

    const { data: inserted, error: dbErr } = await ctx.supabase
      .schema("clinic")
      .from("branding_assets")
      .insert({
        tenant_id: ctx.tenantId,
        kind,
        label: label ?? null,
        storage_key: path,
        mime_type: file.type,
        width_px: widthPx,
        height_px: heightPx,
        file_size: file.size,
      })
      .select("id")
      .single();

    if (dbErr || !inserted) {
      console.error("[uploadBrandingAsset] db insert:", dbErr);
      await storageClient.storage.from(CLINICAL_BUCKET).remove([path]);
      return { ok: false, error: dbErr?.message ?? "Erro ao salvar imagem." };
    }

    revalidatePath("/configuracoes/documentos");
    return { ok: true, id: inserted.id };
  } catch (e) {
    console.error("[uploadBrandingAsset] erro inesperado:", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Erro inesperado ao subir a imagem. Veja o terminal do servidor.",
    };
  }
}

export async function deleteBrandingAsset(
  assetId: string,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const { data: asset, error: fetchErr } = await ctx.supabase
    .schema("clinic")
    .from("branding_assets")
    .select("id, storage_key, tenant_id")
    .eq("id", assetId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message ?? "Falha ao localizar imagem." };
  }
  if (!asset) {
    return { ok: false, error: "Imagem não encontrada." };
  }

  const { error: delErr } = await ctx.supabase
    .schema("clinic")
    .from("branding_assets")
    .delete()
    .eq("id", asset.id)
    .eq("tenant_id", ctx.tenantId);

  if (delErr) {
    return { ok: false, error: delErr.message ?? "Falha ao apagar imagem." };
  }

  await ctx.supabase.storage.from(CLINICAL_BUCKET).remove([asset.storage_key]);

  revalidatePath("/configuracoes/documentos");
  return { ok: true };
}

export async function createBrandingProfile(
  input: CreateBrandingProfileInput,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = createBrandingProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const d = parsed.data;
  const countRes = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .select("id", { head: true, count: "exact" })
    .eq("tenant_id", ctx.tenantId);
  const shouldBeDefault = (countRes.count ?? 0) === 0;

  const { data, error } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .insert({
      tenant_id: ctx.tenantId,
      name: d.name,
      is_default: shouldBeDefault,
      show_header: d.showHeader,
      show_footer: d.showFooter,
      show_logo: d.showLogo,
      header_asset_id: d.headerAssetId,
      footer_asset_id: d.footerAssetId,
      logo_asset_id: d.logoAssetId,
      logo_position: d.logoPosition,
      logo_scale_pct: d.logoScalePct,
      header_height_mm: d.headerHeightMm,
      footer_height_mm: d.footerHeightMm,
      margin_top_mm: d.marginTopMm,
      margin_right_mm: d.marginRightMm,
      margin_bottom_mm: d.marginBottomMm,
      margin_left_mm: d.marginLeftMm,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Falha ao criar perfil." };
  }

  revalidatePath("/configuracoes/documentos");
  return { ok: true, id: data.id };
}

export async function updateBrandingProfile(
  input: UpdateBrandingProfileInput,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = updateBrandingProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const d = parsed.data;
  const { error } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .update({
      name: d.name,
      show_header: d.showHeader,
      show_footer: d.showFooter,
      show_logo: d.showLogo,
      header_asset_id: d.headerAssetId,
      footer_asset_id: d.footerAssetId,
      logo_asset_id: d.logoAssetId,
      logo_position: d.logoPosition,
      logo_scale_pct: d.logoScalePct,
      header_height_mm: d.headerHeightMm,
      footer_height_mm: d.footerHeightMm,
      margin_top_mm: d.marginTopMm,
      margin_right_mm: d.marginRightMm,
      margin_bottom_mm: d.marginBottomMm,
      margin_left_mm: d.marginLeftMm,
    })
    .eq("id", d.id)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Falha ao atualizar perfil." };
  }

  revalidatePath("/configuracoes/documentos");
  return { ok: true };
}

export async function deleteBrandingProfile(
  profileId: string,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .delete()
    .eq("id", profileId)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { ok: false, error: error.message ?? "Falha ao apagar perfil." };
  }

  revalidatePath("/configuracoes/documentos");
  return { ok: true };
}

export async function setDefaultBrandingProfile(
  profileId: string,
): Promise<Ok | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const { data: target } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Perfil não encontrado." };

  const { error: unsetErr } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .update({ is_default: false })
    .eq("tenant_id", ctx.tenantId)
    .neq("id", target.id);
  if (unsetErr) {
    return {
      ok: false,
      error: unsetErr.message ?? "Falha ao atualizar padrão anterior.",
    };
  }

  const { error: setErr } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .update({ is_default: true })
    .eq("id", target.id)
    .eq("tenant_id", ctx.tenantId);
  if (setErr) {
    return { ok: false, error: setErr.message ?? "Falha ao marcar padrão." };
  }

  revalidatePath("/configuracoes/documentos");
  return { ok: true };
}

export async function duplicateBrandingProfile(
  profileId: string,
): Promise<Ok<{ id: string }> | Err> {
  const ctx = await requireClinicalTenantContext();
  if (!ctx.ok) return ctx;

  const { data: src } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!src) return { ok: false, error: "Perfil não encontrado." };

  const row = src as BrandingProfileRow;
  const { data: inserted, error } = await ctx.supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .insert({
      tenant_id: ctx.tenantId,
      name: `${row.name} (cópia)`.slice(0, 80),
      is_default: false,
      show_header: row.show_header,
      show_footer: row.show_footer,
      show_logo: row.show_logo,
      header_asset_id: row.header_asset_id,
      footer_asset_id: row.footer_asset_id,
      logo_asset_id: row.logo_asset_id,
      logo_position: row.logo_position,
      logo_scale_pct: row.logo_scale_pct,
      header_height_mm: row.header_height_mm,
      footer_height_mm: row.footer_height_mm,
      margin_top_mm: row.margin_top_mm,
      margin_right_mm: row.margin_right_mm,
      margin_bottom_mm: row.margin_bottom_mm,
      margin_left_mm: row.margin_left_mm,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Falha ao duplicar." };
  }

  revalidatePath("/configuracoes/documentos");
  return { ok: true, id: inserted.id };
}

/**
 * Retorna o perfil padrão do tenant (se houver), com os assets carregados.
 * Usado no fluxo de geração de PDF quando o usuário não escolhe perfil.
 */
export async function getDefaultBrandingProfileWithAssets(
  supabase: ClinicSupabaseClient,
  tenantId: string,
): Promise<
  | {
      profile: BrandingProfileRow;
      assets: Record<string, BrandingAssetRow | null>;
    }
  | null
> {
  const { data: profile } = await supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .maybeSingle();

  if (!profile) return null;
  const typed = profile as BrandingProfileRow;
  return await hydrateBrandingProfile(supabase, tenantId, typed);
}

export async function getBrandingProfileWithAssets(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  profileId: string,
): Promise<
  | {
      profile: BrandingProfileRow;
      assets: Record<string, BrandingAssetRow | null>;
    }
  | null
> {
  const { data: profile } = await supabase
    .schema("clinic")
    .from("document_branding_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return null;
  return await hydrateBrandingProfile(supabase, tenantId, profile as BrandingProfileRow);
}

async function hydrateBrandingProfile(
  supabase: ClinicSupabaseClient,
  tenantId: string,
  profile: BrandingProfileRow,
): Promise<{
  profile: BrandingProfileRow;
  assets: Record<string, BrandingAssetRow | null>;
}> {
  const ids = [
    profile.header_asset_id,
    profile.footer_asset_id,
    profile.logo_asset_id,
  ].filter((value): value is string => !!value);

  const assetsById: Record<string, BrandingAssetRow | null> = {};
  if (ids.length > 0) {
    const { data: rows } = await supabase
      .schema("clinic")
      .from("branding_assets")
      .select(
        "id, tenant_id, kind, label, storage_key, mime_type, width_px, height_px, file_size, created_at",
      )
      .eq("tenant_id", tenantId)
      .in("id", ids);
    for (const row of (rows ?? []) as BrandingAssetRow[]) {
      assetsById[row.id] = row;
    }
  }

  return {
    profile,
    assets: {
      header: profile.header_asset_id
        ? assetsById[profile.header_asset_id] ?? null
        : null,
      footer: profile.footer_asset_id
        ? assetsById[profile.footer_asset_id] ?? null
        : null,
      logo: profile.logo_asset_id
        ? assetsById[profile.logo_asset_id] ?? null
        : null,
    },
  };
}
