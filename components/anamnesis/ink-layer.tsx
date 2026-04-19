"use client";

import { useMemo, useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { AnamnesisStroke, AnamnesisStrokePoint, AnamnesisStrokeTool } from "@/lib/anamnesis/template-schema";
import {
  buildStrokeOutline,
  getStrokeRenderConfig,
  outlineToFlatPoints,
} from "@/lib/anamnesis/stroke-geometry";

export type InkTool = AnamnesisStrokeTool | "eraser";

type Props = {
  width: number;
  height: number;
  page: number;
  color: string;
  size: number;
  tool: InkTool;
  disabled?: boolean;
  /** Se `true`, permite desenhar/apagar com dedo ou mouse. */
  allowNonPen?: boolean;
  strokes: AnamnesisStroke[];
  onStrokeCommit: (stroke: AnamnesisStroke) => void;
  onEraseStroke: (strokeIndex: number) => void;
};

export function InkLayer({
  width,
  height,
  page,
  color,
  size,
  tool,
  disabled,
  allowNonPen,
  strokes,
  onStrokeCommit,
  onEraseStroke,
}: Props) {
  const [active, setActive] = useState<AnamnesisStrokePoint[] | null>(null);
  const drawingRef = useRef(false);
  const drawingPointerIdRef = useRef<number | null>(null);

  const pageStrokes = useMemo(() => {
    const list: Array<{ index: number; stroke: AnamnesisStroke }> = [];
    strokes.forEach((s, index) => {
      if (s.page === page) list.push({ index, stroke: s });
    });
    return list;
  }, [strokes, page]);

  const active2D = useMemo(() => {
    if (!active) return null;
    const tempStroke: AnamnesisStroke = {
      page,
      color,
      width: size,
      tool: tool === "eraser" ? "pen" : tool,
      opacity: undefined,
      points: active,
    };
    return buildStrokeOutline(tempStroke, width, height);
  }, [active, color, height, page, size, tool, width]);

  const pointerInteractive = !disabled;

  const shouldHandlePointer = (evt: PointerEvent) => {
    if (!pointerInteractive) return false;
    if (allowNonPen) return true;
    return evt.pointerType === "pen";
  };

  const getRelativePoint = (
    stage: ReturnType<KonvaEventObject<PointerEvent>["target"]["getStage"]>,
    evt: PointerEvent,
  ): AnamnesisStrokePoint | null => {
    const pt = stage?.getPointerPosition();
    if (!pt) return null;
    const pressure =
      typeof evt.pressure === "number" && evt.pressure > 0 && evt.pressure <= 1
        ? evt.pressure
        : 0.5;
    return [pt.x / width, pt.y / height, pressure];
  };

  const handleDown = (e: KonvaEventObject<PointerEvent>) => {
    const evt = e.evt;
    if (!shouldHandlePointer(evt)) return;

    if (tool === "eraser") {
      evt.preventDefault();
      const hitIndex = findStrokeAtPoint(
        pageStrokes,
        (evt.clientX - (e.target.getStage()?.container().getBoundingClientRect().left ?? 0)) /
          width,
        (evt.clientY - (e.target.getStage()?.container().getBoundingClientRect().top ?? 0)) /
          height,
        12 / Math.max(width, height),
      );
      if (hitIndex >= 0) onEraseStroke(hitIndex);
      return;
    }

    evt.preventDefault();
    drawingPointerIdRef.current = evt.pointerId;
    drawingRef.current = true;
    const stage = e.target.getStage();
    const pt = getRelativePoint(stage, evt);
    if (!pt) return;
    setActive([pt]);
  };

  const handleMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!drawingRef.current) return;
    const evt = e.evt;
    if (!shouldHandlePointer(evt)) return;
    if (
      drawingPointerIdRef.current !== null &&
      evt.pointerId !== drawingPointerIdRef.current
    ) {
      return;
    }

    if (tool === "eraser") {
      evt.preventDefault();
      const stage = e.target.getStage();
      const pt = stage?.getPointerPosition();
      if (!pt) return;
      const hit = findStrokeAtPoint(
        pageStrokes,
        pt.x / width,
        pt.y / height,
        12 / Math.max(width, height),
      );
      if (hit >= 0) onEraseStroke(hit);
      return;
    }

    evt.preventDefault();
    const stage = e.target.getStage();
    const pt = getRelativePoint(stage, evt);
    if (!pt) return;
    setActive((prev) => (prev ? [...prev, pt] : [pt]));
  };

  const finishDraw = (evt?: PointerEvent) => {
    if (!drawingRef.current) return;
    if (
      evt &&
      drawingPointerIdRef.current !== null &&
      evt.pointerId !== drawingPointerIdRef.current
    ) {
      return;
    }
    drawingPointerIdRef.current = null;
    drawingRef.current = false;
    if (active && active.length >= 2 && tool !== "eraser") {
      const finalized: AnamnesisStroke = {
        page,
        color,
        width: size,
        tool: tool === "highlighter" ? "highlighter" : "pen",
        opacity: tool === "highlighter" ? 0.32 : 1,
        points: active,
      };
      onStrokeCommit(finalized);
    }
    setActive(null);
  };

  const handleUp = (e: KonvaEventObject<PointerEvent>) => {
    finishDraw(e.evt);
  };

  const cursor = !pointerInteractive
    ? "default"
    : tool === "eraser"
      ? "cell"
      : "crosshair";

  return (
    <div
      className="absolute inset-0"
      style={{
        pointerEvents: pointerInteractive ? "auto" : "none",
        touchAction: pointerInteractive ? "none" : undefined,
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        cursor,
      }}
    >
      <Stage
        width={width}
        height={height}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
      >
        <Layer listening={false}>
          {pageStrokes.map(({ index, stroke }) => (
            <StrokeShape key={index} stroke={stroke} width={width} height={height} />
          ))}
          {active2D && active2D.length >= 3 ? (
            <Line
              points={outlineToFlatPoints(active2D)}
              closed
              fill={color}
              opacity={tool === "highlighter" ? 0.32 : 1}
              listening={false}
            />
          ) : null}
        </Layer>
      </Stage>
    </div>
  );
}

function StrokeShape({
  stroke,
  width,
  height,
}: {
  stroke: AnamnesisStroke;
  width: number;
  height: number;
}) {
  const outline = useMemo(
    () => buildStrokeOutline(stroke, width, height),
    [stroke, width, height],
  );
  if (outline.length < 3) return null;
  const cfg = getStrokeRenderConfig(stroke.tool, stroke.width ?? 1.6, stroke.opacity);
  return (
    <Line
      points={outlineToFlatPoints(outline)}
      closed
      fill={stroke.color ?? "#0f172a"}
      opacity={cfg.opacity}
      listening={false}
    />
  );
}

function findStrokeAtPoint(
  pageStrokes: Array<{ index: number; stroke: AnamnesisStroke }>,
  x: number,
  y: number,
  toleranceRel: number,
): number {
  // Percorre na ordem inversa para apagar o traço mais recente quando
  // houver sobreposição.
  for (let i = pageStrokes.length - 1; i >= 0; i -= 1) {
    const { index, stroke } = pageStrokes[i];
    for (const p of stroke.points) {
      const dx = p[0] - x;
      const dy = p[1] - y;
      if (dx * dx + dy * dy <= toleranceRel * toleranceRel) {
        return index;
      }
    }
  }
  return -1;
}
