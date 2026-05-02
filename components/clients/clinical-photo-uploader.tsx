"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BODY_REGIONS,
  BODY_REGION_OPTIONS,
  CAPTURE_ANGLE_LABELS,
  FACE_BONECO_ANGLES,
  MAX_PHOTOS_PER_BATCH,
  type BodyRegion,
} from "@/lib/clinical/body-regions";
import { uploadClinicalPhotosBatch } from "@/lib/clients/record-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

type Row = {
  key: string;
  file: File;
  angle: string;
  caption: string;
  taken_at: string;
  comparisonRole: "" | "before" | "after";
};

export type PurchaseOption = {
  id: string;
  title: string;
  purchased_at: string;
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ClinicalPhotoUploader({
  clientId,
  compact,
  onBatchComplete,
  purchaseOptions = [],
}: {
  clientId: string;
  compact?: boolean;
  onBatchComplete?: () => void;
  /** Procedimentos/compras da paciente para vínculo antes/depois */
  purchaseOptions?: PurchaseOption[];
}) {
  const router = useRouter();
  const baseId = useId();
  const [region, setRegion] = useState<BodyRegion>(BODY_REGIONS.face);
  const [purchaseId, setPurchaseId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const duplicateFaceAngles = useMemo(() => {
    if (region !== BODY_REGIONS.face) return [];
    const seen = new Map<string, number>();
    for (const r of rows) {
      if (!r.angle || r.angle === "custom") continue;
      seen.set(r.angle, (seen.get(r.angle) ?? 0) + 1);
    }
    return [...seen.entries()].filter(([, n]) => n > 1).map(([a]) => a);
  }, [region, rows]);

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = Array.from(list).slice(0, MAX_PHOTOS_PER_BATCH);
    setRows(
      next.map((file) => ({
        key: newKey(),
        file,
        angle: region === BODY_REGIONS.face ? "" : "__other__",
        caption: "",
        taken_at: "",
        comparisonRole: "",
      })),
    );
    setError(null);
  }

  function clearRows() {
    setRows([]);
    setError(null);
  }

  function submit() {
    setError(null);
    if (rows.length === 0) {
      const msg = "Selecione ao menos uma foto.";
      setError(msg);
      notifyError(null, msg);
      return;
    }
    if (rows.length > MAX_PHOTOS_PER_BATCH) {
      const msg = `Limite de ${MAX_PHOTOS_PER_BATCH} fotos por envio.`;
      setError(msg);
      notifyError(null, msg);
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (region === BODY_REGIONS.face && !r.angle) {
        const msg = `Defina o ângulo da foto ${i + 1} (obrigatório para rosto).`;
        setError(msg);
        notifyError(null, msg);
        return;
      }
    }

    const meta = rows.map((r) => ({
      angle: region === BODY_REGIONS.face ? r.angle : null,
      caption: r.caption.trim() || null,
      taken_at:
        r.taken_at.trim() && /^\d{4}-\d{2}-\d{2}$/.test(r.taken_at.trim())
          ? r.taken_at.trim()
          : null,
      comparison_role:
        purchaseId && r.comparisonRole
          ? r.comparisonRole
          : null,
    }));

    const fd = new FormData();
    fd.set("body_region", region);
    fd.set("meta", JSON.stringify(meta));
    if (purchaseId) {
      fd.set("purchase_id", purchaseId);
    }
    for (const r of rows) {
      fd.append("files", r.file);
    }

    startTransition(async () => {
      const result = await uploadClinicalPhotosBatch(clientId, fd);
      if (result.ok) {
        notifySuccess("Fotos enviadas.");
        clearRows();
        router.refresh();
        onBatchComplete?.();
        return;
      }
      setError(result.error);
      notifyError(null, result.error);
    });
  }

  const selectCls =
    "flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35";

  return (
    <section
      className={
        compact
          ? "space-y-5"
          : "rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7"
      }
    >
      <div>
        <h2
          className={
            compact
              ? "text-lg font-semibold text-ink"
              : "text-sm font-semibold uppercase tracking-wide text-ink-subtle"
          }
        >
          {compact ? "Fotos do procedimento" : "Enviar fotos do procedimento"}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Até {MAX_PHOTOS_PER_BATCH} imagens por envio (JPG, PNG ou WebP, máx. 12 MB
          cada). Escolha primeiro a <strong className="font-medium text-ink">região</strong>.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${baseId}-region`}>Região do procedimento</Label>
        <select
          id={`${baseId}-region`}
          className={selectCls}
          value={region}
          onChange={(e) => {
            const v = e.target.value as BodyRegion;
            setRegion(v);
            setRows((prev) =>
              prev.map((r) => ({
                ...r,
                angle: v === BODY_REGIONS.face ? "" : "__other__",
              })),
            );
            setError(null);
          }}
        >
          {BODY_REGION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {region === BODY_REGIONS.face ? (
        <div className="rounded-2xl bg-brand/5 p-4 ring-1 ring-brand/15">
          <p className="text-sm font-medium text-ink">
            Rosto — base para o boneco digital
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Para montar a referência multi-ângulo (frente, perfis, superior e
            inferior), indique o ângulo de <strong>cada</strong> foto. Você pode
            enviar mais de uma imagem com o mesmo ângulo (ex.: antes/depois), mas
            o ideal é cobrir todos os eixos ao longo do tratamento.
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          Para esta região não exigimos ângulos fixos: envie as imagens que forem
          relevantes para documentação e evolução.
        </p>
      )}

      {purchaseOptions.length > 0 ? (
        <div className="space-y-2 rounded-2xl bg-muted/40 p-4 ring-1 ring-line/60">
          <Label htmlFor={`${baseId}-purchase`}>
            Vincular a um procedimento (comparativo antes/depois)
          </Label>
          <select
            id={`${baseId}-purchase`}
            className={selectCls}
            value={purchaseId}
            onChange={(e) => {
              setPurchaseId(e.target.value);
              setRows((prev) =>
                prev.map((r) => ({ ...r, comparisonRole: "" })),
              );
            }}
          >
            <option value="">Nenhum — fotos gerais do prontuário</option>
            {purchaseOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ·{" "}
                {new Date(p.purchased_at).toLocaleDateString("pt-BR")}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-muted">
            Com um procedimento selecionado, marque cada foto como{" "}
            <strong className="text-ink">Antes</strong> ou{" "}
            <strong className="text-ink">Depois</strong> abaixo.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${baseId}-files`}>Imagens</Label>
        <Input
          id={`${baseId}-files`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => onPickFiles(e.target.files)}
        />
        {rows.length > 0 && (
          <p className="text-xs text-ink-subtle">
            {rows.length} arquivo(s) selecionado(s)
          </p>
        )}
      </div>

      {duplicateFaceAngles.length > 0 && region === BODY_REGIONS.face && (
        <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
          Aviso: há mais de uma foto com o mesmo ângulo (
          {duplicateFaceAngles
            .map((a) => CAPTURE_ANGLE_LABELS[a as keyof typeof CAPTURE_ANGLE_LABELS] ?? a)
            .join(", ")}
          ). Isso é permitido, mas confira se era a intenção.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="space-y-4 border-t border-line/60 pt-4">
          {rows.map((r, idx) => (
            <li
              key={r.key}
              className="rounded-xl bg-muted/30 p-4 ring-1 ring-line/50"
            >
              <p className="text-xs font-medium text-ink-subtle">
                Foto {idx + 1} · {(r.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="truncate text-sm text-ink">{r.file.name}</p>
              {region === BODY_REGIONS.face && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`${baseId}-ang-${r.key}`}>Ângulo</Label>
                  <select
                    id={`${baseId}-ang-${r.key}`}
                    className={selectCls}
                    value={r.angle}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.key === r.key ? { ...x, angle: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    <option value="">Selecionar ângulo…</option>
                    {FACE_BONECO_ANGLES.map((a) => (
                      <option key={a} value={a}>
                        {CAPTURE_ANGLE_LABELS[a]}
                      </option>
                    ))}
                    <option value="custom">{CAPTURE_ANGLE_LABELS.custom}</option>
                  </select>
                </div>
              )}
              {purchaseId ? (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`${baseId}-cmp-${r.key}`}>Comparativo</Label>
                  <select
                    id={`${baseId}-cmp-${r.key}`}
                    className={selectCls}
                    value={r.comparisonRole}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.key === r.key
                            ? {
                                ...x,
                                comparisonRole: e.target.value as
                                  | ""
                                  | "before"
                                  | "after",
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <option value="">Sem marcação</option>
                    <option value="before">Antes</option>
                    <option value="after">Depois</option>
                  </select>
                </div>
              ) : null}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${baseId}-cap-${r.key}`}>Legenda (opcional)</Label>
                  <Input
                    id={`${baseId}-cap-${r.key}`}
                    value={r.caption}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.key === r.key ? { ...x, caption: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Ex.: Antes — sessão 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${baseId}-dt-${r.key}`}>Data da foto (opcional)</Label>
                  <Input
                    id={`${baseId}-dt-${r.key}`}
                    type="date"
                    value={r.taken_at}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.key === r.key ? { ...x, taken_at: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          loading={pending}
          loadingLabel="Enviando..."
          disabled={rows.length === 0}
          onClick={submit}
        >
          Enviar fotos
        </Button>
        {rows.length > 0 && (
          <Button type="button" variant="ghost" disabled={pending} onClick={clearRows}>
            Limpar seleção
          </Button>
        )}
      </div>
    </section>
  );
}
