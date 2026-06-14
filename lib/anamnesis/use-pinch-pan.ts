"use client";

import { useCallback, useRef, useState } from "react";

export type ViewportTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

type PinchState = {
  startDistance: number;
  startScale: number;
  startOffsetX: number;
  startOffsetY: number;
  centerX: number;
  centerY: number;
};

type PanState = {
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
};

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

type Options = {
  /** Quando true, dedo único desenha — pan com 1 dedo fica desabilitado. */
  allowFingerDraw?: boolean;
};

export function usePinchPan(options: Options = {}) {
  const { allowFingerDraw = false } = options;
  const [transform, setTransform] = useState<ViewportTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [locked, setLocked] = useState(false);
  const [isGesturing, setIsGesturing] = useState(false);

  const activePointers = useRef(new Map<number, { x: number; y: number; type: string }>());
  const pinchRef = useRef<PinchState | null>(null);
  const panRef = useRef<PanState | null>(null);

  const resetTransform = useCallback(() => {
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  const toggleLock = useCallback(() => {
    setLocked((v) => !v);
  }, []);

  const canPanWithFinger = useCallback(
    (pointerType: string) =>
      !allowFingerDraw && pointerType === "touch" && transform.scale > 1,
    [allowFingerDraw, transform.scale],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (locked) return;
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      activePointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });

      const points = [...activePointers.current.values()];
      if (points.length === 2) {
        setIsGesturing(true);
        const [a, b] = points;
        const center = midpoint(a, b);
        const rect = el.getBoundingClientRect();
        pinchRef.current = {
          startDistance: distance(a, b),
          startScale: transform.scale,
          startOffsetX: transform.offsetX,
          startOffsetY: transform.offsetY,
          centerX: center.x - rect.left,
          centerY: center.y - rect.top,
        };
        panRef.current = null;
      } else if (points.length === 1 && canPanWithFinger(e.pointerType)) {
        setIsGesturing(true);
        panRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startOffsetX: transform.offsetX,
          startOffsetY: transform.offsetY,
        };
        pinchRef.current = null;
      }
    },
    [canPanWithFinger, locked, transform.offsetX, transform.offsetY, transform.scale],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (locked) return;
      if (!activePointers.current.has(e.pointerId)) return;
      const prev = activePointers.current.get(e.pointerId);
      activePointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: prev?.type ?? e.pointerType,
      });

      const points = [...activePointers.current.values()];

      if (points.length === 2 && pinchRef.current) {
        e.preventDefault();
        const [a, b] = points;
        const dist = distance(a, b);
        if (pinchRef.current.startDistance < 1) return;

        const nextScale = clampScale(
          pinchRef.current.startScale * (dist / pinchRef.current.startDistance),
        );
        const scaleRatio = nextScale / pinchRef.current.startScale;
        const cx = pinchRef.current.centerX;
        const cy = pinchRef.current.centerY;

        setTransform({
          scale: nextScale,
          offsetX:
            cx - scaleRatio * (cx - pinchRef.current.startOffsetX),
          offsetY:
            cy - scaleRatio * (cy - pinchRef.current.startOffsetY),
        });
        return;
      }

      if (points.length === 1 && panRef.current && transform.scale > 1) {
        e.preventDefault();
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        setTransform((prev) => ({
          ...prev,
          offsetX: panRef.current!.startOffsetX + dx,
          offsetY: panRef.current!.startOffsetY + dy,
        }));
      }
    },
    [locked, transform.scale],
  );

  const clearGesture = useCallback(() => {
    if (activePointers.current.size === 0) {
      setIsGesturing(false);
      pinchRef.current = null;
      panRef.current = null;
    } else if (activePointers.current.size === 1 && !panRef.current) {
      setIsGesturing(false);
      pinchRef.current = null;
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size < 2) pinchRef.current = null;
      if (activePointers.current.size < 1) panRef.current = null;
      clearGesture();

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignorado se capture já foi liberado
      }
    },
    [clearGesture],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size < 2) pinchRef.current = null;
      if (activePointers.current.size < 1) panRef.current = null;
      clearGesture();
    },
    [clearGesture],
  );

  return {
    transform,
    locked,
    isGesturing,
    toggleLock,
    resetTransform,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
