"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, ChevronRight, Eye, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatPhotoCapturedAt,
  getPhotoDisplayAt,
  getPhotoDisplayDateKey,
} from "@/lib/clinical/photo-display";
import { deleteClinicalPhoto } from "@/lib/clients/record-actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";
import { PacienteFotoLibraryUploader } from "@/components/clients/paciente-foto-library-uploader";

export type FotoBibliotecaItem = {
  id: string;
  caption: string | null;
  captured_at: string | null;
  created_at: string;
};

type Props = {
  clientId: string;
  fotos: FotoBibliotecaItem[];
};

const PAGE_SIZE = 24;

function thumbUrl(photoId: string): string {
  return `/api/clinical/photos/${photoId}/thumb?w=400`;
}

async function fetchPhotoFullUrl(photoId: string): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const res = await fetch(`/api/clinical/photos/${photoId}/full`, {
    credentials: "same-origin",
  });
  const body = (await res.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;
  if (!res.ok) {
    return {
      ok: false,
      error: body?.error ?? "Não foi possível carregar a imagem.",
    };
  }
  if (!body?.url) {
    return { ok: false, error: "Resposta inválida do servidor." };
  }
  return { ok: true, url: body.url };
}

export function PacienteFotosBiblioteca({ clientId, fotos }: Props) {
  const router = useRouter();
  const { confirm, element: confirmDialog } = useConfirmDialog();
  const [activePhoto, setActivePhoto] = useState<FotoBibliotecaItem | null>(
    null,
  );
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [fullUrlLoading, setFullUrlLoading] = useState(false);
  const [fullUrlError, setFullUrlError] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...fotos].sort((a, b) => {
      const da = getPhotoDisplayAt(a.captured_at, a.created_at);
      const db = getPhotoDisplayAt(b.captured_at, b.created_at);
      return db.localeCompare(da);
    });
  }, [fotos]);

  const filtered = useMemo(() => {
    return sorted.filter((foto) => {
      const day = getPhotoDisplayDateKey(foto.captured_at, foto.created_at);
      if (filterFrom && day < filterFrom) return false;
      if (filterTo && day > filterTo) return false;
      return true;
    });
  }, [sorted, filterFrom, filterTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(0);
  }, [filterFrom, filterTo]);

  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(Math.max(0, pageCount - 1));
    }
  }, [page, pageCount]);

  useEffect(() => {
    if (!activePhoto) {
      setFullUrl(null);
      setFullUrlError(null);
      setFullUrlLoading(false);
      return;
    }

    let cancelled = false;
    setFullUrl(null);
    setFullUrlError(null);
    setFullUrlLoading(true);

    void (async () => {
      const result = await fetchPhotoFullUrl(activePhoto.id);
      if (cancelled) return;
      setFullUrlLoading(false);
      if (result.ok) {
        setFullUrl(result.url);
        return;
      }
      setFullUrlError(result.error);
    })();

    return () => {
      cancelled = true;
    };
  }, [activePhoto]);

  function requestDelete(id: string) {
    confirm({
      title: "Excluir foto?",
      description:
        "A imagem será removida do prontuário e do armazenamento. Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve, reject) => {
          void (async () => {
            const result = await deleteClinicalPhoto(clientId, id);
            if (result.ok) {
              notifySuccess("Foto removida.");
              if (activePhoto?.id === id) setActivePhoto(null);
              router.refresh();
              resolve();
              return;
            }
            notifyError(null, result.error);
            reject(new Error(result.error));
          })();
        }),
    });
  }

  const hasDateFilter = filterFrom !== "" || filterTo !== "";

  return (
    <div className="space-y-6">
      <PacienteFotoLibraryUploader clientId={clientId} />

      {sorted.length > 0 ? (
        <div className="grid gap-4 rounded-2xl border border-line/70 bg-muted/20 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="fotos_filter_from">Data de</Label>
            <Input
              id="fotos_filter_from"
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fotos_filter_to">Data até</Label>
            <Input
              id="fotos_filter_to"
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="md:mb-0.5"
            disabled={!hasDateFilter}
            onClick={() => {
              setFilterFrom("");
              setFilterTo("");
            }}
          >
            Limpar filtro
          </Button>
          <p className="text-xs text-ink-muted md:col-span-3">
            Filtra pela data de captura (ou data de envio, quando não houver
            captura). {filtered.length} de {sorted.length} foto
            {sorted.length === 1 ? "" : "s"}.
          </p>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-muted/30 px-6 py-12 text-center">
          <Camera className="mx-auto h-10 w-10 text-ink-subtle" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">
            Nenhuma foto no prontuário
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Envie imagens acima ou anexe fotos em uma ficha de evolução.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink">
            Nenhuma foto neste período
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Ajuste as datas do filtro ou limpe para ver todas.
          </p>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pageItems.map((foto) => {
              const displayAt = getPhotoDisplayAt(
                foto.captured_at,
                foto.created_at,
              );
              return (
                <li
                  key={foto.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-line/60 bg-canvas shadow-[var(--shadow-lift)] transition hover:border-brand/40 hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl(foto.id)}
                    alt={foto.caption ?? "Foto clínica"}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                  <button
                    type="button"
                    onClick={() => setActivePhoto(foto)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Visualizar ${foto.caption ?? "foto"}`}
                  >
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[10px] font-medium text-ink shadow-md">
                      <Eye className="h-3 w-3" />
                      Visualizar
                    </span>
                  </button>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
                    <p className="text-[10px] font-medium text-white">
                      {formatPhotoCapturedAt(displayAt)}
                    </p>
                    {foto.caption ? (
                      <p className="mt-0.5 truncate text-[10px] text-white/85">
                        {foto.caption}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDelete(foto.id);
                    }}
                    className={cn(
                      "absolute right-1.5 top-1.5 rounded-full bg-surface/95 p-1.5 text-ink-muted shadow-sm ring-1 ring-line/60 transition",
                      "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-50 hover:text-red-600",
                    )}
                    aria-label="Excluir foto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>

          {filtered.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-xs text-ink-muted">
                {page + 1} / {pageCount} · {filtered.length} foto
                {filtered.length === 1 ? "" : "s"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPage((p) => Math.min(pageCount - 1, p + 1))
                }
                disabled={page >= pageCount - 1}
                aria-label="Próxima página"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      {activePhoto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-surface p-4 shadow-xl">
            <button
              type="button"
              className="absolute right-4 top-4 z-10 rounded-full bg-muted p-1 text-ink-muted hover:bg-muted/80"
              onClick={() => setActivePhoto(null)}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mt-6 flex min-h-[50vh] flex-1 items-center justify-center overflow-hidden rounded-xl bg-canvas">
              {fullUrlLoading ? (
                <div className="flex flex-col items-center gap-2 text-ink-muted">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                  <p className="text-sm">Carregando imagem original…</p>
                </div>
              ) : fullUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fullUrl}
                  alt={activePhoto.caption ?? "Foto clínica ampliada"}
                  className="max-h-[78vh] max-w-full object-contain"
                />
              ) : (
                <p className="text-sm text-ink-muted">
                  {fullUrlError ?? "Não foi possível carregar a imagem."}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-line/60 pt-3">
              <p className="text-xs text-ink-muted">
                {formatPhotoCapturedAt(
                  getPhotoDisplayAt(
                    activePhoto.captured_at,
                    activePhoto.created_at,
                  ),
                )}
              </p>
              {activePhoto.caption ? (
                <p className="text-sm font-medium leading-relaxed text-ink">
                  {activePhoto.caption}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => requestDelete(activePhoto.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDialog}
    </div>
  );
}
