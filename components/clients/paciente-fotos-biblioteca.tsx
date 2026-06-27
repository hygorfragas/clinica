"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Eye, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  formatPhotoCapturedAt,
  getPhotoDisplayAt,
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
  url: string | null;
};

type Props = {
  clientId: string;
  fotos: FotoBibliotecaItem[];
};

export function PacienteFotosBiblioteca({ clientId, fotos }: Props) {
  const router = useRouter();
  const { confirm, element: confirmDialog } = useConfirmDialog();
  const [activePhoto, setActivePhoto] = useState<FotoBibliotecaItem | null>(
    null,
  );

  const sorted = useMemo(() => {
    return [...fotos].sort((a, b) => {
      const da = getPhotoDisplayAt(a.captured_at, a.created_at);
      const db = getPhotoDisplayAt(b.captured_at, b.created_at);
      return db.localeCompare(da);
    });
  }, [fotos]);

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

  return (
    <div className="space-y-6">
      <PacienteFotoLibraryUploader clientId={clientId} />

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
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((foto) => {
            const displayAt = getPhotoDisplayAt(
              foto.captured_at,
              foto.created_at,
            );
            return (
              <li
                key={foto.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-line/60 bg-canvas shadow-[var(--shadow-lift)] transition hover:border-brand/40 hover:shadow-md"
              >
                {foto.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.url}
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
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-xs text-ink-muted">
                    Erro ao carregar imagem
                  </div>
                )}

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
      )}

      {activePhoto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-surface p-4 shadow-xl">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-muted p-1 text-ink-muted hover:bg-muted/80"
              onClick={() => setActivePhoto(null)}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mt-6 flex aspect-[4/3] flex-1 items-center justify-center overflow-hidden rounded-xl bg-canvas">
              {activePhoto.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activePhoto.url}
                  alt={activePhoto.caption ?? "Foto clínica ampliada"}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <p className="text-sm text-ink-muted">
                  Não foi possível carregar a imagem.
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
