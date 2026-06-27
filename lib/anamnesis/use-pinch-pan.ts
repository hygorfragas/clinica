"use client";

import { useCallback, useRef, useState, type RefObject } from "react";

export type ViewportTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

type PinchState = {
  startDistance: number;
  startScale: number;
  startOffsetX: number;
  startOffsetY: number;
  startOriginX: number;
  startOriginY: number;
};

type PanState = {
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
};

type ScrollState = {
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
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

/** Converte coordenada de tela para o espaço local do elemento (antes do transform). */
function clientToLocal(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return { x: 0, y: 0 };
  }
  const scaleX = el.offsetWidth / rect.width;
  const scaleY = el.offsetHeight / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

type Options = {
  /** Quando true, dedo único desenha — pan com 1 dedo fica desabilitado. */
  allowFingerDraw?: boolean;
  /** Elemento que recebe scale/translate — dimensões = página PDF. */
  contentRef: RefObject<HTMLElement | null>;
  /** Largura/altura da página para reset do transform-origin. */
  pageWidth: number;
  pageHeight: number;
};

export function usePinchPan(options: Options) {
  const { allowFingerDraw = false, contentRef, pageWidth, pageHeight } = options;

  const defaultOriginX = Math.max(0, pageWidth / 2);
  const defaultOriginY = Math.max(0, pageHeight / 2);

  const [transform, setTransform] = useState<ViewportTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    originX: defaultOriginX,
    originY: defaultOriginY,
  });
  const [locked, setLocked] = useState(false);
  const [isGesturing, setIsGesturing] = useState(false);

  const activePointers = useRef(new Map<number, { x: number; y: number; type: string }>());
  const pinchRef = useRef<PinchState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const scrollRef = useRef<ScrollState | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const resetTransform = useCallback(() => {
    const ox = Math.max(0, pageWidth / 2);
    const oy = Math.max(0, pageHeight / 2);
    setTransform({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      originX: ox,
      originY: oy,
    });
  }, [pageWidth, pageHeight]);

  const toggleLock = useCallback(() => {
    setLocked((v) => !v);
  }, []);

  const canPanWithFinger = useCallback(
    (pointerType: string) =>
      !allowFingerDraw && pointerType === "touch" && transformRef.current.scale > 1,
    [allowFingerDraw],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (locked) return;
      if (e.pointerType === "touch" && e.isPrimary === false) {
        e.preventDefault();
      }

      activePointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });

      const points = [...activePointers.current.values()];
      const content = contentRef.current;
      const current = transformRef.current;

      if (points.length === 2 && content) {
        e.preventDefault();
        setIsGesturing(true);
        const [a, b] = points;
        const mid = midpoint(a, b);
        const local = clientToLocal(content, mid.x, mid.y);
        pinchRef.current = {
          startDistance: distance(a, b),
          startScale: current.scale,
          startOffsetX: current.offsetX,
          startOffsetY: current.offsetY,
          startOriginX: local.x,
          startOriginY: local.y,
        };
        panRef.current = null;
        scrollRef.current = null;
        setTransform((prev) => ({
          ...prev,
          originX: local.x,
          originY: local.y,
        }));
      } else if (points.length === 1 && canPanWithFinger(e.pointerType)) {
        setIsGesturing(true);
        panRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startOffsetX: current.offsetX,
          startOffsetY: current.offsetY,
        };
        pinchRef.current = null;
        scrollRef.current = null;
      } else if (
        points.length === 1 &&
        e.pointerType === "touch" &&
        !allowFingerDraw &&
        current.scale <= 1
      ) {
        // Sem zoom e em modo "dedo navega": rola a página com 1 dedo.
        // Mantemos touch-action:none no overlay (pra o Pencil nunca rolar),
        // então a rolagem nativa não acontece — fazemos manualmente aqui.
        scrollRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startScrollLeft: e.currentTarget.scrollLeft,
          startScrollTop: e.currentTarget.scrollTop,
        };
        pinchRef.current = null;
        panRef.current = null;
      }
    },
    [allowFingerDraw, canPanWithFinger, contentRef, locked],
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
      const content = contentRef.current;

      if (points.length === 1 && scrollRef.current) {
        e.preventDefault();
        const dx = e.clientX - scrollRef.current.startX;
        const dy = e.clientY - scrollRef.current.startY;
        e.currentTarget.scrollLeft = scrollRef.current.startScrollLeft - dx;
        e.currentTarget.scrollTop = scrollRef.current.startScrollTop - dy;
        return;
      }

      if (points.length === 2 && pinchRef.current && content) {
        e.preventDefault();
        const [a, b] = points;
        const dist = distance(a, b);
        if (pinchRef.current.startDistance < 1) return;

        const nextScale = clampScale(
          pinchRef.current.startScale * (dist / pinchRef.current.startDistance),
        );

        setTransform({
          scale: nextScale,
          offsetX: pinchRef.current.startOffsetX,
          offsetY: pinchRef.current.startOffsetY,
          originX: pinchRef.current.startOriginX,
          originY: pinchRef.current.startOriginY,
        });
        return;
      }

      if (points.length === 1 && panRef.current && transformRef.current.scale > 1) {
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
    [contentRef, locked],
  );

  const clearGesture = useCallback(() => {
    if (activePointers.current.size === 0) {
      setIsGesturing(false);
      pinchRef.current = null;
      panRef.current = null;
      scrollRef.current = null;
    } else if (activePointers.current.size === 1 && !panRef.current) {
      setIsGesturing(false);
      pinchRef.current = null;
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size < 2) pinchRef.current = null;
      if (activePointers.current.size < 1) {
        panRef.current = null;
        scrollRef.current = null;
      }
      clearGesture();
    },
    [clearGesture],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size < 2) pinchRef.current = null;
      if (activePointers.current.size < 1) {
        panRef.current = null;
        scrollRef.current = null;
      }
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
