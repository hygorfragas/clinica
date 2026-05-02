import type { PDFDocumentProxy } from "pdfjs-dist";
import type { AnamnesisField, AnamnesisFieldType } from "./template-schema";

export async function detectPdfFields(
  pdf: PDFDocumentProxy,
): Promise<AnamnesisField[]> {
  const fields: AnamnesisField[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const annotations = await page.getAnnotations();

    for (const annotation of annotations as Array<Record<string, unknown>>) {
      if (annotation.subtype !== "Widget") continue;
      const fieldType = String(annotation.fieldType ?? "");
      const rawName = String(
        annotation.fieldName ?? annotation.alternativeText ?? "",
      );
      const rect = Array.isArray(annotation.rect)
        ? (annotation.rect as number[])
        : null;
      if (!rawName || !rect || rect.length !== 4) continue;

      const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(rect);
      const left = clamp01(Math.min(vx1, vx2) / viewport.width);
      const top = clamp01(Math.min(vy1, vy2) / viewport.height);
      const width = clampRange(
        Math.abs(vx2 - vx1) / viewport.width,
        0.02,
        1,
      );
      const height = clampRange(
        Math.abs(vy2 - vy1) / viewport.height,
        0.02,
        1,
      );

      fields.push({
        id: rawName,
        label: prettifyFieldName(rawName),
        type: mapPdfFieldType(fieldType),
        page: pageNumber,
        x: left,
        y: top,
        width,
        height,
        placeholder: prettifyFieldName(rawName),
      });
    }
  }

  const dedup = new Map<string, AnamnesisField>();
  for (const f of fields) {
    const key = `${f.page}:${f.id}`;
    if (!dedup.has(key)) dedup.set(key, f);
  }
  return Array.from(dedup.values());
}

function mapPdfFieldType(pdfType: string): AnamnesisFieldType {
  if (pdfType === "Btn") return "checkbox";
  if (pdfType === "Ch") return "select";
  return "text";
}

function prettifyFieldName(value: string): string {
  return value.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampRange(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
