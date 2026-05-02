"use client";

import { useMemo } from "react";

export type DocumentPreviewData = {
  showHeader: boolean;
  showFooter: boolean;
  showLogo: boolean;
  headerUrl: string | null;
  footerUrl: string | null;
  logoUrl: string | null;
  logoAspect: number | null;
  logoPosition:
    | "top-left"
    | "top-center"
    | "top-right"
    | "below-header-left"
    | "below-header-center";
  logoScalePct: number;
  headerHeightMm: number;
  footerHeightMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
};

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Preview fiel do PDF exportado. Usa aspect A4 e porcentagens calculadas a partir
 * dos mesmos valores em mm que o helper `apply-to-pdf.ts` usa no servidor.
 */
export function DocumentPreviewA4({ data }: { data: DocumentPreviewData }) {
  const logoStyle = useMemo(() => {
    if (!data.showLogo || !data.logoUrl) return null;
    const usableWidthMm = A4_WIDTH_MM - data.marginLeftMm - data.marginRightMm;
    const logoWidthMm = (usableWidthMm * data.logoScalePct) / 100;
    const aspect = data.logoAspect ?? 1;
    const logoHeightMm = logoWidthMm / aspect;

    let leftPct: number;
    if (data.logoPosition === "top-center" || data.logoPosition === "below-header-center") {
      leftPct = ((A4_WIDTH_MM - logoWidthMm) / 2 / A4_WIDTH_MM) * 100;
    } else if (data.logoPosition === "top-right") {
      leftPct =
        ((A4_WIDTH_MM - data.marginRightMm - logoWidthMm) / A4_WIDTH_MM) * 100;
    } else {
      leftPct = (data.marginLeftMm / A4_WIDTH_MM) * 100;
    }

    let topMm = data.marginTopMm;
    if (
      data.logoPosition === "below-header-left" ||
      data.logoPosition === "below-header-center"
    ) {
      topMm = (data.showHeader ? data.headerHeightMm : 0) + 4;
    }
    const topPct = (topMm / A4_HEIGHT_MM) * 100;
    const widthPct = (logoWidthMm / A4_WIDTH_MM) * 100;
    const heightPct = (logoHeightMm / A4_HEIGHT_MM) * 100;

    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
    } as const;
  }, [data]);

  const marginBoxStyle = useMemo(() => {
    const extraTopMm =
      data.showHeader ? data.headerHeightMm + data.marginTopMm : data.marginTopMm;
    const extraBottomMm = data.showFooter
      ? data.footerHeightMm + data.marginBottomMm
      : data.marginBottomMm;
    return {
      top: `${(extraTopMm / A4_HEIGHT_MM) * 100}%`,
      bottom: `${(extraBottomMm / A4_HEIGHT_MM) * 100}%`,
      left: `${(data.marginLeftMm / A4_WIDTH_MM) * 100}%`,
      right: `${(data.marginRightMm / A4_WIDTH_MM) * 100}%`,
    };
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        className="relative overflow-hidden rounded-lg bg-white ring-1 ring-line shadow-[0_10px_40px_-15px_rgba(50,45,40,0.25)]"
        style={{ aspectRatio: `${A4_WIDTH_MM} / ${A4_HEIGHT_MM}` }}
      >
        {data.showHeader && data.headerUrl ? (
          <img
            src={data.headerUrl}
            alt=""
            className="absolute inset-x-0 top-0 w-full object-cover"
            style={{ height: `${(data.headerHeightMm / A4_HEIGHT_MM) * 100}%` }}
          />
        ) : data.showHeader ? (
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-center bg-muted/60 text-[9px] uppercase tracking-wider text-ink-subtle"
            style={{ height: `${(data.headerHeightMm / A4_HEIGHT_MM) * 100}%` }}
          >
            header da clínica
          </div>
        ) : null}

        {data.showFooter && data.footerUrl ? (
          <img
            src={data.footerUrl}
            alt=""
            className="absolute inset-x-0 bottom-0 w-full object-cover"
            style={{ height: `${(data.footerHeightMm / A4_HEIGHT_MM) * 100}%` }}
          />
        ) : data.showFooter ? (
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-muted/60 text-[9px] uppercase tracking-wider text-ink-subtle"
            style={{ height: `${(data.footerHeightMm / A4_HEIGHT_MM) * 100}%` }}
          >
            rodapé
          </div>
        ) : null}

        {logoStyle && data.logoUrl ? (
          <img
            src={data.logoUrl}
            alt=""
            className="absolute object-contain"
            style={logoStyle}
          />
        ) : null}

        <div
          className="absolute flex flex-col gap-1 overflow-hidden text-[7px] leading-snug text-ink-muted"
          style={marginBoxStyle}
        >
          <p className="font-semibold uppercase tracking-wider text-[6.5px] text-ink-subtle">
            Amostra do conteúdo
          </p>
          <p>Paciente: Nome da Paciente</p>
          <p>Responsável: Profissional</p>
          <div className="mt-1 space-y-[2px]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-[3px] rounded-full bg-muted"
                style={{
                  width: `${60 + ((index * 13) % 35)}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-ink-subtle">
        Amostra aproximada do PDF em A4
      </p>
    </div>
  );
}
