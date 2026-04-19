"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

let cached: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfJs() {
  if (!cached) {
    cached = (async () => {
      const pdfjs = await import("pdfjs-dist");
      try {
        const workerUrl = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        );
        (
          pdfjs.GlobalWorkerOptions as unknown as { workerSrc: string }
        ).workerSrc = workerUrl.toString();
      } catch {
        const version = (pdfjs as unknown as { version: string }).version;
        (
          pdfjs.GlobalWorkerOptions as unknown as { workerSrc: string }
        ).workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      }
      return pdfjs;
    })();
  }
  return cached;
}

export async function loadPdfDocument(
  src: string | ArrayBuffer | Uint8Array,
): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument(src);
  return task.promise;
}
