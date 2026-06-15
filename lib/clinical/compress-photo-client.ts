"use client";

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;
const OUTPUT_MIME = "image/jpeg";
const SKIP_COMPRESS_BELOW_BYTES = 900 * 1024;

const SUPPORTED_INPUT = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function stripExtension(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  return base || "foto";
}

function loadViaImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode_failed"));
    };
    img.src = url;
  });
}

async function decodeBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari às vezes falha com HEIC via createImageBitmap; tenta <img>.
    }
  }
  return loadViaImage(file);
}

function releaseSource(source: ImageBitmap | HTMLImageElement) {
  if ("close" in source && typeof source.close === "function") {
    source.close();
  }
}

/**
 * Reduz fotos de câmera/galeria (iPad, iPhone) antes do upload para caber no
 * limite das Server Actions e evitar estouro de memória no cliente.
 */
export async function compressPhotoForUpload(file: File): Promise<File> {
  if (!file.size) {
    throw new Error("empty_file");
  }

  const mime = file.type || "";
  if (
    mime &&
    !SUPPORTED_INPUT.has(mime) &&
    !mime.startsWith("image/")
  ) {
    throw new Error("unsupported_mime");
  }

  if (
    file.size <= SKIP_COMPRESS_BELOW_BYTES &&
    (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp")
  ) {
    return file;
  }

  const source = await decodeBitmap(file);
  try {
    const srcW =
      "width" in source ? source.width : (source as HTMLImageElement).naturalWidth;
    const srcH =
      "height" in source
        ? source.height
        : (source as HTMLImageElement).naturalHeight;

    if (!srcW || !srcH) {
      throw new Error("invalid_dimensions");
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas_unavailable");
    }
    ctx.drawImage(source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), OUTPUT_MIME, JPEG_QUALITY);
    });
    if (!blob) {
      throw new Error("encode_failed");
    }

    if (blob.size > MAX_PHOTO_BYTES) {
      throw new Error("too_large_after_compress");
    }

    return new File([blob], `${stripExtension(file.name)}.jpg`, {
      type: OUTPUT_MIME,
      lastModified: Date.now(),
    });
  } finally {
    releaseSource(source);
  }
}

export function photoProcessingErrorMessage(code: unknown): string {
  const key = code instanceof Error ? code.message : String(code);
  switch (key) {
    case "unsupported_mime":
      return "Formato não suportado. Use JPG, PNG ou WebP.";
    case "too_large_after_compress":
      return "A imagem continua grande demais após compressão (máx. 12 MB).";
    case "decode_failed":
    case "invalid_dimensions":
    case "encode_failed":
    case "canvas_unavailable":
      return "Não foi possível processar a imagem. Tente outro arquivo ou formato.";
    default:
      return "Não foi possível preparar a imagem para envio.";
  }
}

export function serverActionTransportErrorMessage(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";

  if (/body exceeded|body size limit|413|payload too large/i.test(msg)) {
    return "As fotos são grandes demais para enviar de uma vez. Envie menos imagens ou use arquivos menores.";
  }

  return "Falha ao enviar as fotos. Verifique a conexão e tente novamente.";
}
