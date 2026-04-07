"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  BODY_REGION_LABELS,
  CAPTURE_ANGLE_LABELS,
  type BodyRegion,
  type FaceBonecoAngle,
} from "@/lib/clinical/body-regions";
import { ClinicalPhotoUploader } from "@/components/clients/clinical-photo-uploader";
import { FacePuppetGuide } from "@/components/clients/face-puppet-guide";
import { deleteClinicalPhoto } from "@/lib/clients/record-actions";

export type FotoComUrl = {
  id: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  url: string | null;
  body_region: string;
  capture_angle: string | null;
};

const ANGLE_SORT: string[] = [
  "front",
  "left",
  "right",
  "top",
  "bottom",
  "custom",
  "unspecified",
];

function regionLabel(r: string): string {
  if (r in BODY_REGION_LABELS) {
    return BODY_REGION_LABELS[r as BodyRegion];
  }
  return r;
}

function angleLabel(a: string | null): string | null {
  if (!a) return null;
  if (a in CAPTURE_ANGLE_LABELS) {
    return CAPTURE_ANGLE_LABELS[a as keyof typeof CAPTURE_ANGLE_LABELS];
  }
  return a;
}

function sortFaceFotos(list: FotoComUrl[]): FotoComUrl[] {
  return [...list].sort((a, b) => {
    const ia = ANGLE_SORT.indexOf(a.capture_angle ?? "");
    const ib = ANGLE_SORT.indexOf(b.capture_angle ?? "");
    const sa = ia === -1 ? 99 : ia;
    const sb = ib === -1 ? 99 : ib;
    if (sa !== sb) return sa - sb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function PacienteFotosPanel({
  clientId,
  fotos,
  missingFaceBonecoAngles,
}: {
  clientId: string;
  fotos: FotoComUrl[];
  missingFaceBonecoAngles: FaceBonecoAngle[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const faceFotos = sortFaceFotos(
    fotos.filter((f) => f.body_region === "face"),
  );
  const otherFotos = fotos.filter((f) => f.body_region !== "face");

  function remove(id: string) {
    if (!confirm("Remover esta foto do prontuário?")) return;
    startTransition(async () => {
      const result = await deleteClinicalPhoto(clientId, id);
      if (result.ok) router.refresh();
    });
  }

  function renderCard(f: FotoComUrl) {
    const ang = angleLabel(f.capture_angle);
    return (
      <li
        key={f.id}
        className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line/80"
      >
        <div className="aspect-[4/3] bg-muted/50">
          {f.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.url}
              alt={f.caption ?? "Foto clínica"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center text-xs text-ink-muted">
              Pré-visualização indisponível.
            </div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {regionLabel(f.body_region)}
            </span>
            {ang && (
              <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                {ang}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-subtle">
            {new Date(f.created_at).toLocaleString("pt-BR")}
            {f.taken_at
              ? ` · ref. ${new Date(f.taken_at).toLocaleDateString("pt-BR")}`
              : ""}
          </p>
          {f.caption && <p className="text-sm text-ink">{f.caption}</p>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 text-danger hover:text-danger"
            disabled={pending}
            onClick={() => remove(f.id)}
          >
            Remover
          </Button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-10">
      <FacePuppetGuide missingAngles={missingFaceBonecoAngles} />

      <ClinicalPhotoUploader clientId={clientId} />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Rosto — sequência para boneco digital
        </h2>
        {faceFotos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nenhuma foto classificada como rosto ainda.
          </p>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {faceFotos.map(renderCard)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Demais regiões
        </h2>
        {otherFotos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nenhuma foto de outras regiões (ou fotos antigas sem região
            classificada aparecem como &quot;Outra&quot; após migração).
          </p>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {otherFotos.map(renderCard)}
          </ul>
        )}
      </section>
    </div>
  );
}
