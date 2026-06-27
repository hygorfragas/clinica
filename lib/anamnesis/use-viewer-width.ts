"use client";

import { useEffect, useState, type RefObject } from "react";

type Options = {
  min?: number;
  max?: number;
  /** Arredonda a largura para múltiplos deste valor (estabiliza a chave de cache). */
  bucket?: number;
  /** Atraso para coalescer mudanças de tamanho (rotação, resize contínuo). */
  debounceMs?: number;
  /** Desconta padding horizontal do elemento (como o viewer do editor). */
  subtractPadding?: boolean;
  /** Valor inicial antes da 1ª medição (evita 1º frame em largura mínima). */
  initial?: number;
};

function compute(
  el: HTMLElement,
  min: number,
  max: number,
  bucket: number,
  subtractPadding: boolean,
): number {
  let w = el.clientWidth;
  if (subtractPadding) {
    const styles = getComputedStyle(el);
    w -= parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  }
  // Bucketiza para que variações de sub-pixel / scrollbar (1–15px) não mudem o
  // valor e, portanto, não disparem re-render nem nova chave de cache.
  const bucketed = Math.round(w / bucket) * bucket;
  return Math.max(min, Math.min(max, Math.floor(bucketed)));
}

/**
 * Mede a largura útil de um container e a devolve bucketizada/clampada.
 *
 * Faz uma medição imediata no mount (1ª pintura sem atraso) e coalesce as
 * mudanças seguintes com debounce — ao girar o tablet, um único re-render em
 * vez de vários flickers. Substitui o ResizeObserver "cru" do editor.
 */
export function useViewerWidth(
  ref: RefObject<HTMLElement | null>,
  opts: Options = {},
): number {
  const {
    min = 280,
    max = 1100,
    bucket = 16,
    debounceMs = 150,
    subtractPadding = true,
    initial = 820,
  } = opts;

  const [width, setWidth] = useState(() =>
    Math.max(min, Math.min(max, initial)),
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const measure = () => {
      const next = compute(el, min, max, bucket, subtractPadding);
      setWidth((prev) => (prev === next ? prev : next));
    };

    measure(); // imediato no mount
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(measure, debounceMs);
    });
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref, min, max, bucket, debounceMs, subtractPadding]);

  return width;
}
