import { getStroke, type StrokeOptions } from "perfect-freehand";
import type {
  AnamnesisStroke,
  AnamnesisStrokePoint,
  AnamnesisStrokeTool,
} from "./template-schema";
import { getStrokePointPressure } from "./template-schema";

/**
 * Helpers compartilhados (client + server) para reconstruir o contorno de um
 * stroke com perfect-freehand. Mantemos aqui a configuração canônica por
 * ferramenta, para garantir que o desenho no Konva e o flatten no pdf-lib
 * fiquem visualmente consistentes.
 */

export type StrokeRenderConfig = {
  /** Espessura absoluta em unidades do canvas destino. */
  size: number;
  /** Multiplicador aplicado ao stroke base (pen/highlighter). */
  thinning: number;
  smoothing: number;
  streamline: number;
  /** Suavidade dos extremos do traço. */
  start: StrokeOptions["start"];
  end: StrokeOptions["end"];
  /** Alpha final aplicado ao fill. */
  opacity: number;
};

export function getStrokeRenderConfig(
  tool: AnamnesisStrokeTool | undefined,
  baseWidth: number,
  opacityOverride?: number,
): StrokeRenderConfig {
  const effectiveTool: AnamnesisStrokeTool = tool ?? "pen";
  if (effectiveTool === "highlighter") {
    return {
      size: Math.max(baseWidth, 10),
      thinning: 0,
      smoothing: 0.6,
      streamline: 0.45,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
      opacity: opacityOverride ?? 0.32,
    };
  }
  return {
    size: Math.max(baseWidth, 0.8),
    thinning: 0.55,
    smoothing: 0.55,
    streamline: 0.55,
    start: { taper: 12, cap: true },
    end: { taper: 12, cap: true },
    opacity: opacityOverride ?? 1,
  };
}

export function strokePointsToInput(
  points: AnamnesisStrokePoint[],
  width: number,
  height: number,
): Array<[number, number, number]> {
  return points.map((p) => [p[0] * width, p[1] * height, getStrokePointPressure(p)]);
}

/**
 * Gera o polígono externo do traço no sistema de coordenadas do destino
 * (largura/altura absolutos). Retorna array de `[x, y]`.
 */
export function buildStrokeOutline(
  stroke: AnamnesisStroke,
  width: number,
  height: number,
): Array<[number, number]> {
  if (stroke.points.length === 0) return [];
  const cfg = getStrokeRenderConfig(stroke.tool, stroke.width ?? 1.6, stroke.opacity);
  const input = strokePointsToInput(stroke.points, width, height);
  const outline = getStroke(input, {
    size: cfg.size,
    thinning: cfg.thinning,
    smoothing: cfg.smoothing,
    streamline: cfg.streamline,
    start: cfg.start,
    end: cfg.end,
    simulatePressure: !hasPressure(stroke.points),
  });
  return outline.map(([x, y]) => [x, y]);
}

function hasPressure(points: AnamnesisStrokePoint[]): boolean {
  for (const p of points) {
    if (p.length === 3) return true;
  }
  return false;
}

/** Converte o outline para o atributo `points` de `Konva.Line` (flat). */
export function outlineToFlatPoints(
  outline: Array<[number, number]>,
): number[] {
  const flat: number[] = [];
  for (const [x, y] of outline) {
    flat.push(x, y);
  }
  return flat;
}

/**
 * Converte o outline para um path SVG `M ... L ... Z` em coordenadas do canvas
 * (Y cresce para baixo). Quando usado com `page.drawSvgPath(path, { x: 0, y:
 * pageHeight })`, o pdf-lib já espelha o Y automaticamente.
 */
export function outlineToSvgPath(outline: Array<[number, number]>): string {
  if (outline.length === 0) return "";
  const parts: string[] = [];
  outline.forEach(([x, y], i) => {
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  });
  parts.push("Z");
  return parts.join(" ");
}
