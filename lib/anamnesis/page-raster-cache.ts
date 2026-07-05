"use client";

/**
 * Cache LRU de páginas de PDF já rasterizadas (client-only).
 *
 * Trocar de página e voltar rerasterizava do zero a cada vez. Aqui guardamos
 * o resultado do `page.render` como `ImageBitmap` (em pixels do device, mesma
 * saída do canvas atual) para que a volta vire um `drawImage` instantâneo,
 * sem flash branco. As miniaturas reaproveitam o mesmo módulo com um bucket
 * fixo (`THUMB_BUCKET`).
 *
 * Há DOIS pools com orçamentos distintos: páginas grandes (bitmaps de ~12–27MB
 * no iPad) ficam num pool pequeno; miniaturas (~0,2MB) num pool maior. Misturá-las
 * num único LRU arriscaria estourar a memória do iPad.
 *
 * O módulo é singleton: vive enquanto o documento estiver aberto e é limpo via
 * `clearForPdf` no unmount do editor / troca de PDF.
 */

export type RasterEntry = {
  bitmap: ImageBitmap;
  /** Dimensões do canvas em pixels do device (width/height do <canvas>). */
  deviceWidth: number;
  deviceHeight: number;
  /** Dimensões lógicas em CSS px (style.width/height e o que o InkLayer usa). */
  cssWidth: number;
  cssHeight: number;
};

/** Bucket fixo usado pelas miniaturas, separado das larguras do canvas principal. */
export const THUMB_BUCKET = -1;

// Páginas grandes: poucas entradas (memória). Miniaturas: muitas e leves.
const MAX_MAIN_ENTRIES = 3;
const MAX_THUMB_ENTRIES = 48;

// Map preserva ordem de inserção → usamos como LRU: no hit, delete+set move a
// entrada para o fim (mais recente); o evict remove sempre a primeira (mais antiga).
const mainCache = new Map<string, RasterEntry>();
const thumbCache = new Map<string, RasterEntry>();

function isThumbKey(key: string): boolean {
  return key.endsWith(`:${THUMB_BUCKET}`);
}

function poolFor(key: string) {
  return isThumbKey(key)
    ? { cache: thumbCache, max: MAX_THUMB_ENTRIES }
    : { cache: mainCache, max: MAX_MAIN_ENTRIES };
}

export function makeKey(
  pdfId: string,
  page: number,
  widthBucket: number,
): string {
  return `${pdfId}:${page}:${widthBucket}`;
}

export function getCached(key: string): RasterEntry | null {
  const { cache } = poolFor(key);
  const entry = cache.get(key);
  if (!entry) return null;
  // Marca como usada recentemente.
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

export function putCached(key: string, entry: RasterEntry): void {
  const { cache, max } = poolFor(key);
  if (cache.has(key)) {
    const prev = cache.get(key);
    if (prev && prev.bitmap !== entry.bitmap) prev.bitmap.close();
    cache.delete(key);
  }
  cache.set(key, entry);
  while (cache.size > max) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    const oldest = cache.get(oldestKey);
    oldest?.bitmap.close();
    cache.delete(oldestKey);
  }
}

/**
 * Procura uma rasterização da mesma página em QUALQUER bucket de largura (pool
 * principal), para usar como preview imediato (escalado) enquanto a largura
 * nova é rasterizada — evita o canvas piscar em branco no resize/rotação.
 */
export function findPlaceholder(
  pdfId: string,
  page: number,
): RasterEntry | null {
  const prefix = `${pdfId}:${page}:`;
  let best: RasterEntry | null = null;
  for (const [key, entry] of mainCache) {
    if (!key.startsWith(prefix)) continue;
    // Prefere o de maior resolução como placeholder (mais nítido ao escalar).
    if (!best || entry.deviceWidth > best.deviceWidth) best = entry;
  }
  return best;
}

/** Libera todas as entradas de um documento (chamar no unmount / troca de PDF). */
export function clearForPdf(pdfId: string): void {
  const prefix = `${pdfId}:`;
  for (const cache of [mainCache, thumbCache]) {
    for (const [key, entry] of cache) {
      if (key.startsWith(prefix)) {
        entry.bitmap.close();
        cache.delete(key);
      }
    }
  }
}
