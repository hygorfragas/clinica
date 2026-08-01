/** MIME permitidos para fotos clínicas (deve coincidir com assertPhotoMime). */
export const PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/** Valida tipo declarado e extensão no cliente (defesa em profundidade; servidor revalida). */
export function isAllowedPhotoFile(file: File): boolean {
  if (!PHOTO_MIME.has(file.type)) return false;
  const lower = file.name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot) : "";
  if (ext && !PHOTO_EXTENSIONS.has(ext)) return false;
  return true;
}

export function filterAllowedPhotoFiles(files: File[]): {
  accepted: File[];
  rejected: File[];
} {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (isAllowedPhotoFile(file)) accepted.push(file);
    else rejected.push(file);
  }
  return { accepted, rejected };
}

/**
 * Confere assinatura binária (magic bytes). Impede executáveis/HTML renomeados como imagem.
 * O servidor nunca interpreta o conteúdo — só grava no Storage após esta checagem.
 */
export function assertPhotoFileSignature(buffer: Buffer): string | null {
  if (buffer.length < 12) {
    return "Arquivo inválido ou corrompido.";
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isJpeg || isPng || isWebp) return null;
  return "O arquivo não é uma imagem JPG, PNG ou WebP válida.";
}
