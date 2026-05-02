"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  AnamnesisStroke,
  AnamnesisStrokePoint,
} from "@/lib/anamnesis/template-schema";

const InkLayer = dynamic(
  () => import("./ink-layer").then((m) => m.InkLayer),
  { ssr: false },
);

type Props = {
  open: boolean;
  fieldLabel: string;
  /** Proporção largura/altura do retângulo do campo no PDF. */
  aspectRatio: number;
  /** Strokes já existentes (em coords normalizadas dentro do retângulo). */
  initialStrokes: SignatureStroke[];
  variant?: "signature" | "initials";
  onCancel: () => void;
  onConfirm: (strokes: SignatureStroke[]) => void;
};

/**
 * Stroke local do pad — pontos em coordenadas normalizadas [0..1] dentro do
 * retângulo do campo. O editor é quem traduz para coords da página antes
 * de salvar como AnamnesisStroke.
 */
export type SignatureStroke = {
  points: AnamnesisStrokePoint[];
  color: string;
  width: number;
};

const DEFAULT_COLOR = "#0f172a";
const DEFAULT_PEN = 1.8;

export function SignaturePadModal({
  open,
  fieldLabel,
  aspectRatio,
  initialStrokes,
  variant = "signature",
  onCancel,
  onConfirm,
}: Props) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [strokes, setStrokes] = useState<SignatureStroke[]>(initialStrokes);

  useEffect(() => {
    if (open) setStrokes(initialStrokes);
  }, [open, initialStrokes]);

  useEffect(() => {
    if (!open) return;
    const target = padRef.current;
    if (!target || typeof ResizeObserver === "undefined") return;
    const compute = () => {
      const rect = target.getBoundingClientRect();
      const w = Math.max(280, Math.floor(rect.width));
      const ratio = Math.max(0.25, Math.min(4, aspectRatio));
      const h = Math.max(140, Math.floor(w / ratio));
      setSize((prev) => {
        if (prev && Math.abs(prev.width - w) < 1 && Math.abs(prev.height - h) < 1) {
          return prev;
        }
        return { width: w, height: h };
      });
    };
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(target);
    return () => obs.disconnect();
  }, [open, aspectRatio]);

  const inkStrokes = useMemo<AnamnesisStroke[]>(
    () =>
      strokes.map((s) => ({
        page: 1,
        points: s.points,
        color: s.color,
        width: s.width,
        tool: "pen" as const,
        opacity: 1,
      })),
    [strokes],
  );

  const handleCommit = useCallback((stroke: AnamnesisStroke) => {
    setStrokes((prev) => [
      ...prev,
      {
        points: stroke.points,
        color: stroke.color ?? DEFAULT_COLOR,
        width: stroke.width ?? DEFAULT_PEN,
      },
    ]);
  }, []);

  const handleErase = useCallback((index: number) => {
    setStrokes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    setStrokes([]);
  }

  function handleConfirm() {
    onConfirm(strokes);
  }

  // Bloqueia scroll do body quando aberto.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Esc fecha.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isInitials = variant === "initials";
  const hint = isInitials
    ? "Faça sua rubrica abaixo. Use caneta, dedo ou mouse."
    : "Assine no espaço abaixo. Use caneta, dedo ou mouse.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isInitials ? "Capturar rubrica" : "Capturar assinatura"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
    >
      <div className="flex h-full max-h-[100dvh] w-full max-w-[860px] flex-col overflow-hidden rounded-3xl bg-surface shadow-lift sm:h-auto sm:max-h-[92dvh]">
        <header className="flex items-start justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              {isInitials ? "Rubrica" : "Assinatura"}
            </p>
            <h2 className="truncate text-base font-semibold text-ink">
              {fieldLabel}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">{hint}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-muted hover:text-ink"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-5">
          <div
            ref={padRef}
            className="mx-auto w-full"
            style={{ maxWidth: 760 }}
          >
            <div
              className="relative w-full overflow-hidden rounded-xl bg-white ring-1 ring-line"
              style={{
                aspectRatio: `${Math.max(0.25, Math.min(4, aspectRatio))} / 1`,
                touchAction: "none",
              }}
            >
              {size ? (
                <InkLayer
                  width={size.width}
                  height={size.height}
                  page={1}
                  color={DEFAULT_COLOR}
                  size={DEFAULT_PEN}
                  tool="pen"
                  allowNonPen
                  strokes={inkStrokes}
                  onStrokeCommit={handleCommit}
                  onEraseStroke={handleErase}
                />
              ) : null}
              {strokes.length === 0 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-ink-subtle">
                  {isInitials ? "Rubrique aqui" : "Assine aqui"}
                </div>
              ) : null}
              <div className="pointer-events-none absolute bottom-2 left-0 right-0 mx-auto h-px w-[80%] bg-line/70" />
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-subtle">
              Linha de referência.{" "}
              {isInitials ? "Mantenha a rubrica curta." : "Assine acima da linha."}
            </p>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-line/70 bg-canvas/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              disabled={strokes.length === 0}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Desfazer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClear}
              disabled={strokes.length === 0}
            >
              <Eraser className="h-3.5 w-3.5" /> Limpar
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={strokes.length === 0}
            >
              Confirmar
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
