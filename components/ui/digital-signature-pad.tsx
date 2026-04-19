"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DigitalSignaturePadHandle = {
  isEmpty: () => boolean;
  clear: () => void;
  /** PNG gerado no cliente (traço vetorial renderizado), para envio ao servidor. */
  toPngBlob: () => Promise<Blob | null>;
};

type Props = {
  className?: string;
  /** Texto explicativo acima da área */
  label?: string;
  /** Altura visual da área em px */
  heightPx?: number;
};

/**
 * Captura de assinatura no estilo assinadores web (canvas + traço com largura variável).
 * Caneta (Pointer Events) tende a ser mais estável que dedo; `touch-action: none` reduz scroll acidental.
 */
export const DigitalSignaturePad = forwardRef<
  DigitalSignaturePadHandle,
  Props
>(function DigitalSignaturePad(
  { className, label, heightPx = 176 },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useImperativeHandle(ref, () => ({
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    clear: () => padRef.current?.clear(),
    toPngBlob: () => {
      const pad = padRef.current;
      const canvas = canvasRef.current;
      if (!pad || pad.isEmpty() || !canvas) {
        return Promise.resolve(null);
      }
      return new Promise((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          "image/png",
          0.92,
        );
      });
    },
  }));

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = Math.max(wrap.offsetWidth || wrap.clientWidth, 280);
    const h = heightPx;
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    canvas.style.width = "100%";
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);
    }

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)",
      penColor: "rgb(23, 23, 23)",
      minWidth: 0.45,
      maxWidth: 2.85,
      throttle: 12,
      velocityFilterWeight: 0.72,
      minDistance: 2,
    });
    padRef.current = pad;

    return () => {
      pad.off();
      padRef.current = null;
    };
  }, [heightPx]);

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <p className="text-sm font-medium text-ink">{label}</p>
      ) : null}
      <p className="text-xs leading-relaxed text-ink-muted">
        Assinatura digital na tela (mesma família de tecnologia de assinadores web).
        Caneta ou stylus costuma ser mais preciso que o dedo; evite apoiar a palma na
        borda do dispositivo para reduzir traços espúrios.
      </p>
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden rounded-xl border border-line bg-white shadow-inner"
        style={{ touchAction: "none", overscrollBehavior: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair"
          style={{ touchAction: "none" }}
          aria-label="Área de assinatura digital"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => padRef.current?.clear()}
      >
        Limpar
      </Button>
    </div>
  );
});
