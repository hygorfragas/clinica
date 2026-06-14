"use client";

import { Fragment } from "react";
import {
  ArrowLeft,
  Check,
  Eraser,
  Highlighter,
  Pen,
  Redo2,
  Trash2,
  Undo2,
  Hand,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InteractiveTool = "pen" | "highlighter" | "eraser";

export type ThicknessPreset = { id: string; label: string; value: number };

export type ColorSwatch = { id: string; color: string; label: string };

export const DEFAULT_COLORS: ColorSwatch[] = [
  { id: "ink", color: "#0f172a", label: "Tinta" },
  { id: "blue", color: "#1d4ed8", label: "Azul" },
  { id: "red", color: "#b91c1c", label: "Vermelho" },
  { id: "green", color: "#15803d", label: "Verde" },
  { id: "amber", color: "#b45309", label: "Laranja" },
];

export const PEN_THICKNESSES: ThicknessPreset[] = [
  { id: "fine", label: "Fina", value: 1.6 },
  { id: "medium", label: "Média", value: 3.0 },
  { id: "thick", label: "Grossa", value: 5.0 },
];

export const HIGHLIGHTER_THICKNESSES: ThicknessPreset[] = [
  { id: "h-medium", label: "Média", value: 14 },
  { id: "h-thick", label: "Grossa", value: 22 },
];

type Props = {
  tool: InteractiveTool;
  onToolChange: (t: InteractiveTool) => void;
  color: string;
  onColorChange: (c: string) => void;
  size: number;
  onSizeChange: (n: number) => void;
  allowNonPen: boolean;
  onAllowNonPenChange: (v: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  onClearAll: () => void;
  onBack: () => void;
  onFinalize: () => void;
  finalizing?: boolean;
  viewportLocked?: boolean;
  onToggleViewportLock?: () => void;
  title?: string;
  subtitle?: string;
};

export function InteractiveToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  allowNonPen,
  onAllowNonPenChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  onClearAll,
  onBack,
  onFinalize,
  finalizing,
  viewportLocked,
  onToggleViewportLock,
  title,
  subtitle,
}: Props) {
  const thicknesses = tool === "highlighter" ? HIGHLIGHTER_THICKNESSES : PEN_THICKNESSES;

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-line/80 bg-surface/95 px-3 py-2 shadow-sm backdrop-blur md:px-5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onBack}
        aria-label="Voltar"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {title ? (
        <div className="mr-2 flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-ink">{title}</span>
          {subtitle ? (
            <span className="truncate text-[11px] text-ink-muted">{subtitle}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mx-1 hidden h-7 w-px bg-line md:block" />

      {/* Ferramenta */}
      <div className="inline-flex rounded-full bg-canvas p-0.5 ring-1 ring-line">
        <ToolPill active={tool === "pen"} onClick={() => onToolChange("pen")}>
          <Pen className="h-4 w-4" />
          Caneta
        </ToolPill>
        <ToolPill
          active={tool === "highlighter"}
          onClick={() => onToolChange("highlighter")}
        >
          <Highlighter className="h-4 w-4" />
          Marca-texto
        </ToolPill>
        <ToolPill active={tool === "eraser"} onClick={() => onToolChange("eraser")}>
          <Eraser className="h-4 w-4" />
          Borracha
        </ToolPill>
      </div>

      {/* Cores — só para caneta e marca-texto */}
      {tool !== "eraser" ? (
        <Fragment>
          <div className="mx-1 hidden h-7 w-px bg-line md:block" />
          <div className="flex items-center gap-1 rounded-full bg-canvas p-1 ring-1 ring-line">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                onClick={() => onColorChange(c.color)}
                className={cn(
                  "h-6 w-6 rounded-full border transition",
                  color.toLowerCase() === c.color.toLowerCase()
                    ? "border-brand ring-2 ring-brand/30"
                    : "border-line",
                )}
                style={{ backgroundColor: c.color }}
              />
            ))}
            <label
              className="ml-1 h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-line"
              title="Cor personalizada"
              style={{ backgroundColor: color }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className="h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </Fragment>
      ) : null}

      {/* Espessura */}
      <div className="mx-1 hidden h-7 w-px bg-line md:block" />
      <div className="inline-flex items-center gap-1 rounded-full bg-canvas p-0.5 ring-1 ring-line">
        {thicknesses.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSizeChange(t.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition",
              Math.abs(size - t.value) < 0.001
                ? "bg-brand text-white shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
            aria-label={`Espessura ${t.label}`}
          >
            <span
              className="inline-block rounded-full bg-current"
              style={{
                width: Math.min(14, 4 + t.value * 0.6),
                height: Math.min(14, 4 + t.value * 0.6),
              }}
            />
            {t.label}
          </button>
        ))}
      </div>

      {/* Ações */}
      <div className="mx-1 hidden h-7 w-px bg-line md:block" />
      <div className="inline-flex items-center gap-1">
        <IconButton onClick={onUndo} disabled={!canUndo} aria-label="Desfazer">
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={onRedo} disabled={!canRedo} aria-label="Refazer">
          <Redo2 className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={onClearPage} aria-label="Limpar página atual" title="Limpar página">
          <Trash2 className="h-4 w-4" />
        </IconButton>
        <button
          type="button"
          onClick={onClearAll}
          className="ml-1 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide text-danger/80 transition hover:bg-danger/10 hover:text-danger"
        >
          Limpar tudo
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {onToggleViewportLock ? (
          <button
            type="button"
            onClick={onToggleViewportLock}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-wide transition",
              viewportLocked
                ? "bg-brand text-white"
                : "bg-canvas text-ink-muted ring-1 ring-line hover:text-ink",
            )}
            title="Travar zoom e posição do PDF"
            aria-pressed={viewportLocked}
          >
            {viewportLocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
            {viewportLocked ? "Travado" : "Travar"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onAllowNonPenChange(!allowNonPen)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-wide transition",
            allowNonPen
              ? "bg-brand text-white"
              : "bg-canvas text-ink-muted ring-1 ring-line hover:text-ink",
          )}
          title="Permitir desenhar com dedo/mouse (útil em notebook sem caneta)"
        >
          <Hand className="h-3.5 w-3.5" />
          {allowNonPen ? "Dedo/Mouse: ON" : "Dedo/Mouse: OFF"}
        </button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={onFinalize}
          disabled={finalizing}
        >
          <Check className="h-4 w-4" />
          {finalizing ? "Finalizando…" : "Finalizar e gerar PDF"}
        </Button>
      </div>
    </div>
  );
}

function ToolPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
        active ? "bg-brand text-white shadow-sm" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition",
        "hover:bg-brand/10 hover:text-brand",
        "disabled:opacity-40 disabled:pointer-events-none",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
