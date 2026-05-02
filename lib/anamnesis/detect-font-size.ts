"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * Detecta o tamanho de fonte do texto adjacente/sob um retângulo do PDF.
 *
 * Estratégia:
 * 1. Pega o `textContent` da página inteira via pdfjs.
 * 2. Filtra os items cuja posição cai dentro (ou logo acima/abaixo, em
 *    distância de até 1.5x a altura do retângulo) do retângulo do campo.
 * 3. Calcula a média ponderada dos tamanhos (peso = nº de caracteres do item).
 * 4. Se nenhum item próximo, faz fallback para a média de fonte da página.
 *
 * Retorna em pontos PDF (1pt = 1/72"). Coordenadas vêm normalizadas em
 * [0..1] no retângulo do PDF — convertidas internamente para a escala do
 * pdfjs (origem topo-esquerdo do viewport).
 */
export async function detectFieldFontSize(
  pdf: PDFDocumentProxy,
  args: {
    page: number;
    /** retângulo do campo, em coords normalizadas (UI) — origem topo-esquerda. */
    x: number;
    y: number;
    width: number;
    height: number;
  },
): Promise<number | null> {
  try {
    const page = await pdf.getPage(args.page);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const pw = viewport.width;
    const ph = viewport.height;

    // Retângulo do campo em coords do viewport (origem topo-esquerda).
    const rectLeft = args.x * pw;
    const rectTop = args.y * ph;
    const rectRight = rectLeft + args.width * pw;
    const rectBottom = rectTop + args.height * ph;
    const rectHeight = args.height * ph;
    // Tolerância vertical: 1.5x altura do campo (texto pode estar acima como label).
    const tolY = Math.max(rectHeight * 1.5, 8);

    type Item = { fontSize: number; weight: number };
    const matches: Item[] = [];
    const allItems: Item[] = [];

    for (const raw of textContent.items as Array<unknown>) {
      const item = raw as {
        str?: string;
        transform?: number[];
        height?: number;
        width?: number;
      };
      if (!item.str || item.str.trim().length === 0) continue;
      const t = item.transform;
      if (!t || t.length < 6) continue;
      // pdfjs entrega `transform = [scaleX, 0, 0, scaleY, posX, posY]`
      // (em PDF user space — origem inferior-esquerda).
      // O fontSize efetivo é hypot(t[2], t[3]).
      const fontSize = Math.hypot(t[2], t[3]);
      if (!Number.isFinite(fontSize) || fontSize < 4 || fontSize > 96) continue;

      const itemX = t[4];
      // Converte y do PDF (origem inferior) para viewport (origem superior).
      const itemYTopView = ph - t[5];
      const itemWidth = item.width ?? fontSize * (item.str.length * 0.5);
      const itemX2 = itemX + itemWidth;

      const weight = item.str.length;
      allItems.push({ fontSize, weight });

      const overlapsX = itemX2 >= rectLeft && itemX <= rectRight;
      const verticallyClose =
        itemYTopView >= rectTop - tolY && itemYTopView <= rectBottom + tolY;
      if (overlapsX && verticallyClose) {
        matches.push({ fontSize, weight });
      }
    }

    function weightedAvg(items: Item[]): number | null {
      if (items.length === 0) return null;
      let sum = 0;
      let totalWeight = 0;
      for (const it of items) {
        sum += it.fontSize * it.weight;
        totalWeight += it.weight;
      }
      return totalWeight > 0 ? sum / totalWeight : null;
    }

    const local = weightedAvg(matches);
    if (local) return Math.round(local * 10) / 10;
    const global = weightedAvg(allItems);
    return global ? Math.round(global * 10) / 10 : null;
  } catch (err) {
    console.error("[detectFieldFontSize] falhou:", err);
    return null;
  }
}
