"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  BODY_REGION_LABELS,
  CAPTURE_ANGLE_LABELS,
  type BodyRegion,
  type FaceBonecoAngle,
} from "@/lib/clinical/body-regions";
import {
  ClinicalPhotoUploader,
  type PurchaseOption,
} from "@/components/clients/clinical-photo-uploader";
import { FacePuppetGuide } from "@/components/clients/face-puppet-guide";
import { deleteClinicalPhoto } from "@/lib/clients/record-actions";
import { cn } from "@/lib/utils";

export type FotoComUrl = {
  id: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  url: string | null;
  body_region: string;
  capture_angle: string | null;
  purchase_id: string | null;
  comparison_role: string | null;
  purchase_title: string | null;
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
  purchaseOptions,
}: {
  clientId: string;
  fotos: FotoComUrl[];
  missingFaceBonecoAngles: FaceBonecoAngle[];
  purchaseOptions: PurchaseOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const linked = useMemo(
    () => fotos.filter((f) => f.purchase_id),
    [fotos],
  );
  const unlinked = useMemo(
    () => fotos.filter((f) => !f.purchase_id),
    [fotos],
  );

  const byPurchase = useMemo(() => {
    const m = new Map<string, FotoComUrl[]>();
    for (const f of linked) {
      if (!f.purchase_id) continue;
      const arr = m.get(f.purchase_id) ?? [];
      arr.push(f);
      m.set(f.purchase_id, arr);
    }
    return m;
  }, [linked]);

  const purchaseSections = useMemo(() => {
    return purchaseOptions
      .filter((p) => (byPurchase.get(p.id) ?? []).length > 0)
      .sort(
        (a, b) =>
          new Date(b.purchased_at).getTime() -
          new Date(a.purchased_at).getTime(),
      );
  }, [purchaseOptions, byPurchase]);

  const faceFotos = sortFaceFotos(
    unlinked.filter((f) => f.body_region === "face"),
  );
  const otherFotos = unlinked.filter((f) => f.body_region !== "face");

  function remove(id: string) {
    if (!confirm("Remover esta foto do prontuário?")) return;
    startTransition(async () => {
      const result = await deleteClinicalPhoto(clientId, id);
      if (result.ok) router.refresh();
    });
  }

  function renderCard(f: FotoComUrl, opts?: { emphasizeCompare?: boolean }) {
    const ang = angleLabel(f.capture_angle);
    const emphasize = opts?.emphasizeCompare;
    return (
      <li
        key={f.id}
        className={cn(
          "overflow-hidden rounded-2xl bg-surface ring-1 ring-line/80",
          emphasize && "ring-2 ring-brand/35 shadow-lift",
        )}
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
            {f.comparison_role === "before" && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                Antes
              </span>
            )}
            {f.comparison_role === "after" && (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900">
                Depois
              </span>
            )}
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
    <div className="space-y-12">
      <FacePuppetGuide missingAngles={missingFaceBonecoAngles} />

      <ClinicalPhotoUploader
        clientId={clientId}
        purchaseOptions={purchaseOptions}
      />

      {purchaseSections.length > 0 ? (
        <section className="space-y-8">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
              Comparativo por procedimento
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Fotos vinculadas a uma compra registrada na aba{" "}
              <strong className="font-medium text-ink">Procedimentos</strong>.
              Use <strong className="text-ink">Antes</strong> e{" "}
              <strong className="text-ink">Depois</strong> no envio para
              organizar o par.
            </p>
          </div>
          {purchaseSections.map((meta) => {
            const list = byPurchase.get(meta.id) ?? [];
            const before = list.filter((x) => x.comparison_role === "before");
            const after = list.filter((x) => x.comparison_role === "after");
            const rest = list.filter(
              (x) => x.comparison_role !== "before" && x.comparison_role !== "after",
            );
            return (
              <div
                key={meta.id}
                id={`compra-${meta.id}`}
                className="scroll-mt-28 rounded-[1.75rem] bg-gradient-to-b from-surface to-muted/20 p-6 shadow-lift ring-1 ring-line md:p-8"
              >
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line/60 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                      Procedimento
                    </p>
                    <h3 className="text-lg font-semibold text-ink">{meta.title}</h3>
                    <p className="text-xs text-ink-muted">
                      Compra em{" "}
                      {new Date(meta.purchased_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
                {(before.length > 0 || after.length > 0) && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-900/90">
                        Antes
                      </p>
                      {before.length === 0 ? (
                        <p className="text-sm text-ink-muted">
                          Nenhuma foto marcada como antes.
                        </p>
                      ) : (
                        <ul className="grid gap-5 sm:grid-cols-1">
                          {before.map((f) => renderCard(f, { emphasizeCompare: true }))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-900/90">
                        Depois
                      </p>
                      {after.length === 0 ? (
                        <p className="text-sm text-ink-muted">
                          Nenhuma foto marcada como depois.
                        </p>
                      ) : (
                        <ul className="grid gap-5 sm:grid-cols-1">
                          {after.map((f) => renderCard(f, { emphasizeCompare: true }))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                {rest.length > 0 && (
                  <div className="mt-6 border-t border-line/50 pt-6">
                    <p className="mb-3 text-xs font-semibold text-ink-muted">
                      Outras fotos deste procedimento
                    </p>
                    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {rest.map((f) => renderCard(f))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Rosto — sequência para boneco digital
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Apenas fotos <strong className="font-medium text-ink">sem</strong>{" "}
          vínculo a um procedimento (envio geral ou sem seleção na lista).
        </p>
        {faceFotos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nenhuma foto classificada como rosto nesta categoria.
          </p>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {faceFotos.map((f) => renderCard(f))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Demais regiões (sem vínculo a procedimento)
        </h2>
        {otherFotos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Nenhuma foto de outras regiões nesta categoria.
          </p>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {otherFotos.map((f) => renderCard(f))}
          </ul>
        )}
      </section>
    </div>
  );
}
