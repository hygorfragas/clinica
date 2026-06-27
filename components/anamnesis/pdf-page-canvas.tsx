"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  findPlaceholder,
  getCached,
  makeKey,
  putCached,
  type RasterEntry,
} from "@/lib/anamnesis/page-raster-cache";

type Props = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  targetWidth: number;
  /**
   * Liga o cache LRU de páginas rasterizadas. Só o editor interativo usa;
   * desktop/designer mantêm o caminho original (sem cache) intacto.
   */
  enableCache?: boolean;
  onPageLoaded?: (info: {
    pageNumber: number;
    width: number;
    height: number;
  }) => void;
};

/** Pinta uma entrada de cache (bitmap em device px) no canvas, síncrono. */
function paintCached(canvas: HTMLCanvasElement, entry: RasterEntry) {
  canvas.width = entry.deviceWidth;
  canvas.height = entry.deviceHeight;
  canvas.style.width = `${entry.cssWidth}px`;
  canvas.style.height = `${entry.cssHeight}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(entry.bitmap, 0, 0);
}

export function PdfPageCanvas({
  pdf,
  pageNumber,
  targetWidth,
  enableCache,
  onPageLoaded,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentTask: ReturnType<PDFPageProxy["render"]> | null = null;

    const pdfId =
      enableCache && pdf.fingerprints ? pdf.fingerprints[0] ?? null : null;
    const cacheKey = pdfId ? makeKey(pdfId, pageNumber, targetWidth) : null;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Cache hit: pinta instantaneamente, sem rasterizar (sem flash branco).
      if (cacheKey) {
        const hit = getCached(cacheKey);
        if (hit) {
          paintCached(canvas, hit);
          setSize({ width: hit.cssWidth, height: hit.cssHeight });
          onPageLoaded?.({
            pageNumber,
            width: hit.cssWidth,
            height: hit.cssHeight,
          });
          return;
        }
      }

      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const rotation = page.rotate ?? 0;
      const viewport0 = page.getViewport({ scale: 1, rotation });
      const scale = targetWidth / viewport0.width;
      const viewport = page.getViewport({ scale, rotation });
      const rawRatio =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      // Safari/iPadOS limita o canvas a ~16.7 Mpx de área e ~4096px por lado.
      // Em paisagem (renderWidth maior) com devicePixelRatio alto o canvas
      // estoura esse teto e o Safari deixa o rodapé da página em branco —
      // por isso o PDF "vinha faltando o final". Limitamos o ratio para que
      // nenhuma dimensão nem a área ultrapasse o limite, preservando a página
      // inteira (com leve perda de nitidez apenas quando necessário).
      const MAX_CANVAS_SIDE = 4096;
      const MAX_CANVAS_AREA = 16_777_216;
      const sideCap = Math.min(
        MAX_CANVAS_SIDE / viewport.width,
        MAX_CANVAS_SIDE / viewport.height,
      );
      const areaCap = Math.sqrt(
        MAX_CANVAS_AREA / (viewport.width * viewport.height),
      );
      const ratio = Math.max(1, Math.min(rawRatio, sideCap, areaCap));
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Preview imediato: se houver a mesma página em outro bucket de largura
      // (caso de resize/rotação), pinta escalado pra suavizar até o render real.
      if (pdfId) {
        const placeholder = findPlaceholder(pdfId, pageNumber);
        if (placeholder) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(placeholder.bitmap, 0, 0, canvas.width, canvas.height);
        }
      }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      currentTask = page.render({ canvasContext: ctx, viewport });
      try {
        await currentTask.promise;
        if (cancelled) return;
        setSize({ width: viewport.width, height: viewport.height });
        onPageLoaded?.({
          pageNumber,
          width: viewport.width,
          height: viewport.height,
        });
        // Guarda no cache APÓS exibir (não atrasa a pintura nem o InkLayer).
        if (cacheKey && typeof createImageBitmap === "function") {
          try {
            const bitmap = await createImageBitmap(canvas);
            if (cancelled) {
              bitmap.close();
            } else {
              putCached(cacheKey, {
                bitmap,
                deviceWidth: canvas.width,
                deviceHeight: canvas.height,
                cssWidth: viewport.width,
                cssHeight: viewport.height,
              });
            }
          } catch {
            // Sem cache neste render; o caminho normal já desenhou.
          }
        }
      } catch (err) {
        if (!(err instanceof Error) || err.name !== "RenderingCancelledException") {
          console.error("Falha ao renderizar página do PDF", err);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
      currentTask?.cancel();
    };
  }, [pdf, pageNumber, targetWidth, enableCache, onPageLoaded]);

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={
        size
          ? { width: size.width, height: size.height }
          : { width: targetWidth, height: Math.round(targetWidth * 1.414) }
      }
    >
      <canvas
        ref={canvasRef}
        className="block rounded-lg shadow-sm ring-1 ring-line"
        style={
          size
            ? { width: size.width, height: size.height, display: "block" }
            : { width: targetWidth, height: Math.round(targetWidth * 1.414), display: "block" }
        }
      />
    </div>
  );
}
