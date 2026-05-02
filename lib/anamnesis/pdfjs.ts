"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

let cached: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfJs() {
  if (!cached) {
    cached = (async () => {
      const pdfjs = await import("pdfjs-dist");

      // Worker servido localmente em /public/pdf-worker/.
      // Copia mantida em sincronia via script `npm run pdf:copy-worker`
      // (rodado pelo postinstall). Garantia: mesmo origin, sem CORS,
      // disponível offline e em qualquer modo do bundler.
      (pdfjs.GlobalWorkerOptions as unknown as { workerSrc: string }).workerSrc =
        "/pdf-worker/pdf.worker.min.mjs";
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
