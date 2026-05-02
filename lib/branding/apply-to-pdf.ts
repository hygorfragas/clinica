import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";
import {
  getBrandingProfileWithAssets,
  getDefaultBrandingProfileWithAssets,
  type BrandingAssetRow,
  type BrandingProfileRow,
} from "@/lib/branding/actions";

export const MM_TO_PT = 2.83464567;

export type AppliedBranding = {
  profile: BrandingProfileRow;
  headerImage: PDFImage | null;
  footerImage: PDFImage | null;
  logoImage: PDFImage | null;
  logoNaturalAspect: number | null;
};

export type ContentBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function mm(value: number): number {
  return value * MM_TO_PT;
}

async function downloadAssetBytes(
  supabase: ClinicSupabaseClient,
  asset: BrandingAssetRow,
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage
    .from(CLINICAL_BUCKET)
    .download(asset.storage_key);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function embedBrandingImage(
  pdfDoc: PDFDocument,
  supabase: ClinicSupabaseClient,
  asset: BrandingAssetRow | null | undefined,
): Promise<PDFImage | null> {
  if (!asset) return null;
  const bytes = await downloadAssetBytes(supabase, asset);
  if (!bytes) return null;
  try {
    if (asset.mime_type === "image/png" || asset.mime_type === "image/webp") {
      // pdf-lib não embeda WebP diretamente; tratamos WebP como png tentativamente
      // (a UI restringe uploads, na prática raramente ocorre erro aqui).
      return await pdfDoc.embedPng(bytes);
    }
    return await pdfDoc.embedJpg(bytes);
  } catch {
    try {
      return await pdfDoc.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

export async function resolveBrandingForPdf(params: {
  supabase: ClinicSupabaseClient;
  tenantId: string;
  pdfDoc: PDFDocument;
  profileId?: string | null;
}): Promise<AppliedBranding | null> {
  const { supabase, tenantId, pdfDoc, profileId } = params;
  const resolved = profileId
    ? await getBrandingProfileWithAssets(supabase, tenantId, profileId)
    : await getDefaultBrandingProfileWithAssets(supabase, tenantId);

  if (!resolved) return null;
  const { profile, assets } = resolved;

  const [headerImage, footerImage, logoImage] = await Promise.all([
    profile.show_header
      ? embedBrandingImage(pdfDoc, supabase, assets.header ?? null)
      : Promise.resolve<PDFImage | null>(null),
    profile.show_footer
      ? embedBrandingImage(pdfDoc, supabase, assets.footer ?? null)
      : Promise.resolve<PDFImage | null>(null),
    profile.show_logo
      ? embedBrandingImage(pdfDoc, supabase, assets.logo ?? null)
      : Promise.resolve<PDFImage | null>(null),
  ]);

  const logoNaturalAspect =
    assets.logo && assets.logo.width_px && assets.logo.height_px
      ? assets.logo.width_px / assets.logo.height_px
      : logoImage
        ? logoImage.width / Math.max(1, logoImage.height)
        : null;

  return {
    profile,
    headerImage,
    footerImage,
    logoImage,
    logoNaturalAspect,
  };
}

/**
 * Desenha header, footer e logo na página conforme o perfil.
 * Chame uma vez por página antes/depois do conteúdo (ordem não importa para a área útil).
 */
export function drawBrandingOnPage(page: PDFPage, applied: AppliedBranding): void {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const { profile } = applied;

  if (profile.show_header && applied.headerImage) {
    const h = mm(profile.header_height_mm);
    const w = pageWidth;
    const x = 0;
    const y = pageHeight - h;
    page.drawImage(applied.headerImage, { x, y, width: w, height: h });
  }

  if (profile.show_footer && applied.footerImage) {
    const h = mm(profile.footer_height_mm);
    const w = pageWidth;
    page.drawImage(applied.footerImage, {
      x: 0,
      y: 0,
      width: w,
      height: h,
    });
  }

  if (profile.show_logo && applied.logoImage && applied.logoNaturalAspect) {
    const marginL = mm(profile.margin_left_mm);
    const marginR = mm(profile.margin_right_mm);
    const headerH = profile.show_header ? mm(profile.header_height_mm) : 0;
    const usableWidth = pageWidth - marginL - marginR;
    const logoW = (usableWidth * profile.logo_scale_pct) / 100;
    const logoH = logoW / applied.logoNaturalAspect;

    let x = marginL;
    const position = profile.logo_position;
    if (position === "top-center" || position === "below-header-center") {
      x = (pageWidth - logoW) / 2;
    } else if (position === "top-right") {
      x = pageWidth - marginR - logoW;
    }

    let y = pageHeight - mm(profile.margin_top_mm) - logoH;
    if (position === "below-header-left" || position === "below-header-center") {
      y = pageHeight - headerH - mm(4) - logoH;
    }
    page.drawImage(applied.logoImage, { x, y, width: logoW, height: logoH });
  }
}

/**
 * Retorna a caixa onde o conteúdo (texto / tabelas) deve ser desenhado,
 * respeitando o espaço reservado a header, footer e margens do perfil.
 *
 * Se não houver branding aplicado, um fallback conservador é devolvido.
 */
export function computeContentBox(params: {
  page: PDFPage;
  applied: AppliedBranding | null;
}): ContentBox {
  const { page, applied } = params;
  const { width, height } = page.getSize();

  if (!applied) {
    return { x: 40, y: 60, width: width - 80, height: height - 120 };
  }

  const { profile } = applied;
  const marginTop = mm(profile.margin_top_mm);
  const marginRight = mm(profile.margin_right_mm);
  const marginBottom = mm(profile.margin_bottom_mm);
  const marginLeft = mm(profile.margin_left_mm);
  const headerH = profile.show_header ? mm(profile.header_height_mm) : 0;
  const footerH = profile.show_footer ? mm(profile.footer_height_mm) : 0;

  // Se o logo está logo abaixo do header, empurramos o conteúdo para baixo do logo.
  let extraTop = 0;
  if (
    profile.show_logo &&
    applied.logoImage &&
    applied.logoNaturalAspect &&
    (profile.logo_position === "below-header-left" ||
      profile.logo_position === "below-header-center")
  ) {
    const usableWidth = width - marginLeft - marginRight;
    const logoW = (usableWidth * profile.logo_scale_pct) / 100;
    const logoH = logoW / applied.logoNaturalAspect;
    extraTop = logoH + mm(4);
  }

  const top = height - headerH - marginTop - extraTop;
  const bottom = footerH + marginBottom;

  return {
    x: marginLeft,
    y: bottom,
    width: width - marginLeft - marginRight,
    height: Math.max(0, top - bottom),
  };
}
