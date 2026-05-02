import { z } from "zod";

export const BRANDING_KINDS = ["header", "footer", "logo"] as const;
export type BrandingKind = (typeof BRANDING_KINDS)[number];

export const BRANDING_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const MAX_BRANDING_BYTES = 4 * 1024 * 1024;

export const LOGO_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "below-header-left",
  "below-header-center",
] as const;
export type LogoPosition = (typeof LOGO_POSITIONS)[number];

/**
 * Recomendações por tipo. Usadas só na UI como dica — o servidor não bloqueia
 * uploads com base em proporção/tamanho recomendado, apenas em tamanhos
 * fisicamente impossíveis (ver `assertBrandingImageDimensions`).
 */
export const BRANDING_REQUIREMENTS: Record<
  BrandingKind,
  {
    recommendedLabel: string;
    description: string;
  }
> = {
  header: {
    recommendedLabel: "2480×280 px (faixa larga, ~30 mm no topo do A4)",
    description:
      "Imagem de topo que ocupa toda a largura do papel. Proporção bem horizontal funciona melhor.",
  },
  footer: {
    recommendedLabel: "2480×240 px (faixa larga, ~20 mm no rodapé do A4)",
    description:
      "Imagem de rodapé. Proporção horizontal alongada funciona melhor.",
  },
  logo: {
    recommendedLabel: "600×600 px a 1200×1200 px (PNG com fundo transparente)",
    description:
      "Logo aplicado dentro da área útil do documento. PNG com transparência é o ideal.",
  },
};

/** Mínimo absoluto e máximo absoluto de pixels aceitos no upload. */
const ABSOLUTE_MIN_PX = 50;
const ABSOLUTE_MAX_PX = 10000;

export const uploadBrandingAssetSchema = z.object({
  kind: z.enum(BRANDING_KINDS),
  label: z
    .string()
    .trim()
    .max(80, "Rótulo curto demais (máx. 80 caracteres)")
    .optional()
    .nullable(),
  widthPx: z.number().int().positive().max(10000),
  heightPx: z.number().int().positive().max(10000),
});

export type UploadBrandingAssetInput = z.infer<typeof uploadBrandingAssetSchema>;

const profileBaseSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao perfil.").max(80),
  showHeader: z.boolean(),
  showFooter: z.boolean(),
  showLogo: z.boolean(),
  headerAssetId: z.string().uuid().nullable(),
  footerAssetId: z.string().uuid().nullable(),
  logoAssetId: z.string().uuid().nullable(),
  logoPosition: z.enum(LOGO_POSITIONS),
  logoScalePct: z.number().int().min(10).max(100),
  headerHeightMm: z.number().int().min(5).max(80),
  footerHeightMm: z.number().int().min(5).max(60),
  marginTopMm: z.number().int().min(0).max(60),
  marginRightMm: z.number().int().min(0).max(60),
  marginBottomMm: z.number().int().min(0).max(60),
  marginLeftMm: z.number().int().min(0).max(60),
});

export const createBrandingProfileSchema = profileBaseSchema;
export const updateBrandingProfileSchema = profileBaseSchema.extend({
  id: z.string().uuid(),
});

export type CreateBrandingProfileInput = z.infer<
  typeof createBrandingProfileSchema
>;
export type UpdateBrandingProfileInput = z.infer<
  typeof updateBrandingProfileSchema
>;

export function assertBrandingImageDimensions(
  _kind: BrandingKind,
  widthPx: number,
  heightPx: number,
): string | null {
  if (widthPx < ABSOLUTE_MIN_PX || heightPx < ABSOLUTE_MIN_PX) {
    return `A imagem está muito pequena (mínimo ${ABSOLUTE_MIN_PX}×${ABSOLUTE_MIN_PX}px).`;
  }
  if (widthPx > ABSOLUTE_MAX_PX || heightPx > ABSOLUTE_MAX_PX) {
    return `A imagem ultrapassa o limite de ${ABSOLUTE_MAX_PX}px.`;
  }
  return null;
}

export function assertBrandingMime(mime: string): string | null {
  if (!BRANDING_MIME_TYPES.has(mime)) {
    return "Formato inválido. Use PNG, JPG ou WebP.";
  }
  return null;
}

export function brandingFileExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}
