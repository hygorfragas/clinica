import sharp from "sharp";

const THUMB_MAX_WIDTH = 480;
const THUMB_QUALITY = 75;

/** Convenção: miniatura WebP ao lado do original no bucket clinical. */
export function thumbStorageKey(originalKey: string): string {
  return `${originalKey}-thumb.webp`;
}

/** Gera buffer WebP redimensionado para grid e proxy. */
export async function generatePhotoThumb(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}

/** Redimensiona original on-the-fly para fotos legadas sem thumb persistida. */
export async function resizePhotoForProxy(
  buffer: Buffer,
  width: number,
): Promise<Buffer> {
  const clamped = Math.min(Math.max(width, 64), 800);
  return sharp(buffer)
    .rotate()
    .resize({ width: clamped, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}
