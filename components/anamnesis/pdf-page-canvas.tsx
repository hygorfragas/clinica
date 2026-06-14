"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

type Props = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  targetWidth: number;
  onPageLoaded?: (info: {
    pageNumber: number;
    width: number;
    height: number;
  }) => void;
};

export function PdfPageCanvas({ pdf, pageNumber, targetWidth, onPageLoaded }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentTask: ReturnType<PDFPageProxy["render"]> | null = null;

    async function render() {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const rotation = page.rotate ?? 0;
      const viewport0 = page.getViewport({ scale: 1, rotation });
      const scale = targetWidth / viewport0.width;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
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
  }, [pdf, pageNumber, targetWidth, onPageLoaded]);

  return (
    <div
      className="relative"
      style={
        size
          ? { width: size.width, height: size.height }
          : { width: targetWidth, height: targetWidth * 1.414 }
      }
    >
      <canvas ref={canvasRef} className="block rounded-lg shadow-sm ring-1 ring-line" />
    </div>
  );
}
