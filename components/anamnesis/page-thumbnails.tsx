"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  pdf: PDFDocumentProxy | null;
  activePage: number;
  onSelect: (page: number) => void;
  /** Quantidade de strokes por página (para mostrar indicador). */
  strokeCountByPage?: Record<number, number>;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function PageThumbnails({
  pdf,
  activePage,
  onSelect,
  strokeCountByPage,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const pageNumbers = useMemo(
    () => (pdf ? Array.from({ length: pdf.numPages }, (_, i) => i + 1) : []),
    [pdf],
  );

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-line bg-surface/80 transition-all",
        collapsed ? "w-10" : "w-28 md:w-32",
      )}
    >
      <div className="flex items-center justify-between border-b border-line/80 px-2 py-2">
        {!collapsed ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Páginas
          </span>
        ) : null}
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-brand/10 hover:text-brand"
            aria-label={collapsed ? "Expandir miniaturas" : "Recolher miniaturas"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-2 py-3">
        {!pdf ? (
          <p className="text-[10px] text-ink-muted">Carregando…</p>
        ) : collapsed ? (
          pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                "flex h-8 w-6 items-center justify-center rounded text-[11px] font-medium transition",
                activePage === p
                  ? "bg-brand text-white"
                  : "text-ink-muted hover:bg-brand/10 hover:text-brand",
              )}
              aria-label={`Página ${p}`}
            >
              {p}
            </button>
          ))
        ) : (
          pageNumbers.map((p) => (
            <ThumbItem
              key={p}
              pdf={pdf}
              page={p}
              active={activePage === p}
              onClick={() => onSelect(p)}
              strokeCount={strokeCountByPage?.[p] ?? 0}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ThumbItem({
  pdf,
  page,
  active,
  onClick,
  strokeCount,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  active: boolean;
  onClick: () => void;
  strokeCount: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const pg = await pdf.getPage(page);
      if (cancelled) return;
      const viewport0 = pg.getViewport({ scale: 1 });
      const width = 100;
      const scale = width / viewport0.width;
      const viewport = pg.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      setRatio(viewport.height / viewport.width);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const task = pg.render({ canvasContext: ctx, viewport });
      try {
        await task.promise;
      } catch (err) {
        if (!(err instanceof Error) || err.name !== "RenderingCancelledException") {
          console.error("Falha ao renderizar miniatura", err);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [pdf, page]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-stretch gap-1 text-left",
        "group",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-md ring-1 transition",
          active
            ? "ring-2 ring-brand"
            : "ring-line group-hover:ring-brand/40",
        )}
        style={{ aspectRatio: `1 / ${ratio}` }}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
        {strokeCount > 0 ? (
          <span className="absolute bottom-1 right-1 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
            {strokeCount}
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "text-center text-[10px]",
          active ? "font-semibold text-brand" : "text-ink-muted",
        )}
      >
        Página {page}
      </span>
    </button>
  );
}
