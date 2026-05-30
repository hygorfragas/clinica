"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { CLINICAL_BUCKET } from "@/lib/clinical/storage";
import { BODY_REGION_OPTIONS, type BodyRegion } from "@/lib/clinical/body-regions";
import { uploadEvolutionSubmissionPhotos } from "@/lib/clients/record-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PhotoListItem = {
  id: string;
  caption: string | null;
  body_region: string;
  capture_angle: string | null;
  comparison_role: string | null;
  evolution_submission_id: string | null;
  created_at: string;
  signedUrl: string | null;
};

type Props = {
  clientId: string;
  submissionId?: string | null;
  readOnly?: boolean;
};

type PendingRow = {
  key: string;
  file: File;
  comparison: "" | "before" | "after";
  caption: string;
  previewUrl: string;
};

const PAGE_SIZE = 6;
const SWIPE_THRESHOLD_PX = 40;
const MAX_BATCH = 6;

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function EvolutionPhotoSidePanel({
  clientId,
  submissionId,
  readOnly = false,
}: Props) {
  const [photos, setPhotos] = useState<PhotoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState<PhotoListItem | null>(null);
  const [filter, setFilter] = useState<"all" | "session">("all");
  const [page, setPage] = useState(0);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [bodyRegion, setBodyRegion] = useState<BodyRegion>(
    BODY_REGION_OPTIONS[0]?.value ?? ("face" as BodyRegion),
  );
  const [uploading, startUpload] = useTransition();
  const [reloadTick, setReloadTick] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createBrowserSupabaseClient();

    async function loadPhotos() {
      try {
        setLoading(true);
        const { data: rows, error } = await supabase
          .schema("clinic")
          .from("photos")
          .select(
            "id, caption, body_region, capture_angle, comparison_role, evolution_submission_id, storage_key, created_at",
          )
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });

        if (error || !rows) {
          console.error("[evolution-photos] Error loading photos:", error?.message);
          return;
        }

        const resolved = await Promise.all(
          rows.map(async (row) => {
            let signedUrl: string | null = null;
            if (row.storage_key) {
              const { data } = await supabase.storage
                .from(CLINICAL_BUCKET)
                .createSignedUrl(row.storage_key, 60 * 60);
              signedUrl = data?.signedUrl ?? null;
            }
            return {
              id: row.id,
              caption: row.caption,
              body_region: row.body_region,
              capture_angle: row.capture_angle,
              comparison_role: row.comparison_role,
              evolution_submission_id: row.evolution_submission_id,
              created_at: row.created_at,
              signedUrl,
            };
          }),
        );

        if (active) setPhotos(resolved);
      } catch (err) {
        console.error("[evolution-photos] Unexpected error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPhotos();
    return () => {
      active = false;
    };
  }, [clientId, reloadTick]);

  // Limpa object URLs ao desmontar / quando rows mudam (evita leak).
  useEffect(() => {
    return () => {
      for (const r of rows) URL.revokeObjectURL(r.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPhotos = useMemo(() => {
    if (filter === "session" && submissionId) {
      return photos.filter((p) => p.evolution_submission_id === submissionId);
    }
    return photos;
  }, [photos, filter, submissionId]);

  const pageCount = Math.max(1, Math.ceil(filteredPhotos.length / PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [filter, submissionId]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [pageCount, page]);

  const currentPagePhotos = useMemo(
    () => filteredPhotos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredPhotos, page],
  );

  function goPrev() {
    setPage((p) => Math.max(0, p - 1));
  }
  function goNext() {
    setPage((p) => Math.min(pageCount - 1, p + 1));
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    setRows((prev) => {
      const room = Math.max(0, MAX_BATCH - prev.length);
      const next = incoming.slice(0, room).map<PendingRow>((file) => ({
        key: newKey(),
        file,
        comparison: "",
        caption: "",
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...next];
    });
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const target = prev.find((r) => r.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((r) => r.key !== key);
    });
  }

  function clearRows() {
    for (const r of rows) URL.revokeObjectURL(r.previewUrl);
    setRows([]);
  }

  function submit() {
    if (!submissionId) {
      notifyError(null, "Salve a evolução antes de anexar fotos.");
      return;
    }
    if (rows.length === 0) {
      notifyError(null, "Selecione ao menos uma foto.");
      return;
    }

    const fd = new FormData();
    fd.set(
      "meta",
      JSON.stringify(
        rows.map((r) => ({
          caption: r.caption.trim() || null,
          comparison_role: r.comparison || null,
          body_region: bodyRegion,
        })),
      ),
    );
    for (const r of rows) fd.append("files", r.file);

    startUpload(async () => {
      const result = await uploadEvolutionSubmissionPhotos(
        clientId,
        submissionId,
        fd,
      );
      if (!result.ok) {
        notifyError(null, result.error);
        return;
      }
      notifySuccess(`${rows.length} foto(s) anexada(s) à evolução.`);
      clearRows();
      setUploaderOpen(false);
      setFilter("session");
      setReloadTick((t) => t + 1);
    });
  }

  const sessionCount = submissionId
    ? photos.filter((p) => p.evolution_submission_id === submissionId).length
    : 0;

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            Fotos da evolução
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            Anexe fotos da sessão (câmera ou galeria) e classifique como Antes
            ou Depois.
          </p>
        </div>
        {!readOnly && submissionId ? (
          <button
            type="button"
            onClick={() => setUploaderOpen((v) => !v)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium transition",
              uploaderOpen
                ? "bg-muted text-ink"
                : "bg-brand text-white hover:brightness-95",
            )}
            aria-expanded={uploaderOpen}
          >
            {uploaderOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {uploaderOpen ? "Fechar" : "Adicionar"}
          </button>
        ) : null}
      </div>

      {!submissionId && !readOnly ? (
        <p className="mb-3 rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-ink-muted">
          Salve um rascunho da evolução para liberar o anexo de fotos a esta
          ficha.
        </p>
      ) : null}

      {uploaderOpen && submissionId ? (
        <div className="mb-3 space-y-3 rounded-xl border border-line/70 bg-canvas/60 p-3">
          {/* Hidden inputs — disparados pelos botões abaixo. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={rows.length >= MAX_BATCH || uploading}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand text-xs font-medium text-white shadow-sm transition hover:brightness-95 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              Tirar foto
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={rows.length >= MAX_BATCH || uploading}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-secondary-container text-xs font-medium text-on-secondary-container shadow-sm transition hover:brightness-95 disabled:opacity-50"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Da galeria
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
              Região
            </label>
            <select
              value={bodyRegion}
              onChange={(e) => setBodyRegion(e.target.value as BodyRegion)}
              className="h-9 w-full rounded-md border border-line bg-canvas px-2 text-xs"
              disabled={uploading}
            >
              {BODY_REGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {rows.length > 0 ? (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.key}
                  className="flex gap-2 rounded-lg bg-surface p-2 ring-1 ring-line/60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.previewUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-ink-muted">
                        {r.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted hover:bg-danger/10 hover:text-danger"
                        aria-label="Remover"
                        disabled={uploading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      {(["", "before", "after"] as const).map((opt) => (
                        <button
                          key={opt || "none"}
                          type="button"
                          onClick={() =>
                            setRows((prev) =>
                              prev.map((x) =>
                                x.key === r.key ? { ...x, comparison: opt } : x,
                              ),
                            )
                          }
                          disabled={uploading}
                          className={cn(
                            "h-6 flex-1 rounded text-[10px] font-medium transition",
                            r.comparison === opt
                              ? opt === "before"
                                ? "bg-amber-200 text-amber-900"
                                : opt === "after"
                                  ? "bg-emerald-200 text-emerald-900"
                                  : "bg-muted text-ink"
                              : "bg-canvas text-ink-muted ring-1 ring-line/60 hover:bg-muted/50",
                          )}
                        >
                          {opt === "before"
                            ? "Antes"
                            : opt === "after"
                              ? "Depois"
                              : "Sem"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={r.caption}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.key === r.key ? { ...x, caption: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="Legenda (opcional)"
                      disabled={uploading}
                      className="h-7 w-full rounded border border-line bg-canvas px-2 text-[11px]"
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md bg-muted/40 px-2 py-1.5 text-center text-[11px] text-ink-muted">
              Nenhuma foto selecionada (máx. {MAX_BATCH} por envio).
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            {rows.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearRows}
                disabled={uploading}
              >
                Limpar
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={rows.length === 0 || uploading}
              loading={uploading}
              loadingLabel="Enviando..."
            >
              <Upload className="h-3.5 w-3.5" />
              Anexar à ficha
            </Button>
          </div>
        </div>
      ) : null}

      {/* Filtro de origem */}
      {submissionId ? (
        <div className="mb-2 inline-flex rounded-full bg-canvas p-0.5 ring-1 ring-line/60">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition",
              filter === "all"
                ? "bg-brand text-white shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            Todas ({photos.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("session")}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition",
              filter === "session"
                ? "bg-brand text-white shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            Desta sessão ({sessionCount})
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center space-y-3 py-8 text-ink-muted">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="text-xs">Carregando fotos...</span>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-3">
          <div
            className="min-h-0 min-w-0 flex-1 select-none overflow-y-auto pr-1"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            aria-roledescription="carousel"
            aria-label="Galeria de fotos clínicas"
          >
            {filteredPhotos.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center text-ink-muted">
                <Camera className="mb-2 h-5 w-5 text-ink-subtle" />
                <p className="text-[11px]">
                  {filter === "session"
                    ? "Nenhuma foto anexada a esta sessão ainda."
                    : "Nenhuma foto no prontuário."}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {currentPagePhotos.map((photo) => {
                  const isSession =
                    submissionId != null &&
                    photo.evolution_submission_id === submissionId;
                  return (
                    <li
                      key={photo.id}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-xl bg-canvas border transition-all hover:shadow-sm",
                        isSession
                          ? "border-brand/60 ring-1 ring-brand/30"
                          : "border-line/60 hover:border-brand/40",
                      )}
                    >
                      {photo.signedUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.signedUrl}
                            alt={photo.caption ?? "Foto clínica"}
                            loading="lazy"
                            className="h-full w-full object-cover transition-all group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={() => setActivePhoto(photo)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                            aria-label={`Visualizar ${photo.caption ?? "foto"}`}
                          >
                            <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[10px] font-medium text-ink shadow-md">
                              <Eye className="h-3 w-3" />
                              Visualizar
                            </span>
                          </button>
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-ink-muted">
                          Erro ao carregar imagem
                        </div>
                      )}

                      <div className="absolute left-1.5 top-1.5 flex flex-col gap-1 pointer-events-none">
                        {photo.comparison_role === "before" && (
                          <span className="rounded bg-amber-500/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white tracking-wide">
                            Antes
                          </span>
                        )}
                        {photo.comparison_role === "after" && (
                          <span className="rounded bg-emerald-500/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white tracking-wide">
                            Depois
                          </span>
                        )}
                        {isSession && (
                          <span className="rounded bg-brand px-1 py-0.5 text-[8px] font-bold uppercase text-white tracking-wide">
                            Sessão
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {filteredPhotos.length > 0 ? (
            <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={page === 0}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition",
                  page === 0
                    ? "cursor-not-allowed text-ink-subtle/50"
                    : "text-ink-muted hover:bg-brand/10 hover:text-brand",
                )}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Ant.
              </button>
              <span className="text-[10px] text-ink-muted">
                {page + 1} / {pageCount} · {filteredPhotos.length} foto(s)
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={page >= pageCount - 1}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition",
                  page >= pageCount - 1
                    ? "cursor-not-allowed text-ink-subtle/50"
                    : "text-ink-muted hover:bg-brand/10 hover:text-brand",
                )}
                aria-label="Próxima página"
              >
                Próx. <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {activePhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="relative max-w-3xl w-full rounded-2xl bg-surface p-4 shadow-xl flex flex-col max-h-[90vh]">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-muted p-1 text-ink-muted hover:bg-muted/80"
              onClick={() => setActivePhoto(null)}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex-1 overflow-hidden rounded-xl bg-canvas flex items-center justify-center mt-6 aspect-[4/3]">
              {activePhoto.signedUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activePhoto.signedUrl}
                  alt={activePhoto.caption ?? "Foto clínica zoom"}
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-line/60 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                  Região: {activePhoto.body_region}
                </span>
                {activePhoto.capture_angle && (
                  <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                    Ângulo: {activePhoto.capture_angle}
                  </span>
                )}
                {activePhoto.comparison_role === "before" && (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    Antes
                  </span>
                )}
                {activePhoto.comparison_role === "after" && (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900">
                    Depois
                  </span>
                )}
                <span className="text-xs text-ink-muted">
                  Enviada em {new Date(activePhoto.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              {activePhoto.caption && (
                <p className="text-sm text-ink font-medium leading-relaxed">
                  {activePhoto.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
