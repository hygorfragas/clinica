"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClinicDateTimePicker } from "@/components/ui/clinic-datetime-picker";
import { Label } from "@/components/ui/label";
import {
  filterAllowedPhotoFiles,
  PHOTO_ACCEPT,
} from "@/lib/clinical/photo-file-validation";
import { MAX_PHOTO_BATCH_BYTES } from "@/lib/clinical/storage";
import {
  clinicDateTimeLocalToUtcIso,
  clinicNowDateTimeLocalValue,
} from "@/lib/dates";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";
import {
  PhotoUploadProgressCard,
  type PhotoUploadProgressState,
} from "@/components/clients/photo-upload-progress-card";

type Props = {
  clientId: string;
};

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0);
}

function totalBytes(files: File[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}

type LibraryPhotoUploadResponse =
  | { ok: true; photoId: string }
  | { ok: false; error: string };

async function uploadLibraryPhotoViaApi(
  clientId: string,
  capturedIso: string,
  file: File,
  skipRevalidate: boolean,
): Promise<LibraryPhotoUploadResponse> {
  const fd = new FormData();
  fd.set("client_id", clientId);
  fd.set("captured_at", capturedIso);
  fd.set("file", file);
  if (skipRevalidate) {
    fd.set("skip_revalidate", "1");
  }

  let res: Response;
  try {
    res = await fetch("/api/clinical/photos/upload", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
  } catch {
    return {
      ok: false,
      error: "Falha no envio (arquivo grande demais ou conexão interrompida).",
    };
  }

  const body = (await res.json().catch(() => null)) as
    | LibraryPhotoUploadResponse
    | null;

  if (!body || typeof body.ok !== "boolean") {
    return { ok: false, error: "Resposta inválida do servidor." };
  }

  return body;
}

export function PacienteFotoLibraryUploader({ clientId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [capturedAtLocal, setCapturedAtLocal] = useState(() =>
    clinicNowDateTimeLocalValue(),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<PhotoUploadProgressState | null>(
    null,
  );

  const dismissProgress = useCallback(() => setProgress(null), []);

  useEffect(() => {
    if (!uploading) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [uploading]);

  function useToday() {
    setCapturedAtLocal(clinicNowDateTimeLocalValue());
  }

  function onFilesChange(list: FileList | null) {
    if (!list) {
      setFiles([]);
      return;
    }
    const picked = Array.from(list);
    const { accepted, rejected } = filterAllowedPhotoFiles(picked);
    if (rejected.length > 0) {
      setError(
        "Apenas imagens JPG, PNG ou WebP são permitidas. Arquivos inválidos foram ignorados.",
      );
    } else {
      setError(null);
    }

    const batchTotal = totalBytes(accepted);
    if (batchTotal > MAX_PHOTO_BATCH_BYTES) {
      setError(
        `Lote de ${formatMegabytes(batchTotal)} MB — máximo ${formatMegabytes(MAX_PHOTO_BATCH_BYTES)} MB por envio.`,
      );
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFiles(accepted);
  }

  async function submit() {
    if (!capturedAtLocal.trim()) {
      setError("Informe a data e hora da captura.");
      return;
    }
    if (files.length === 0) {
      setError("Selecione ao menos uma imagem.");
      return;
    }

    const batchTotal = totalBytes(files);
    if (batchTotal > MAX_PHOTO_BATCH_BYTES) {
      setError(
        `Lote de ${formatMegabytes(batchTotal)} MB — máximo ${formatMegabytes(MAX_PHOTO_BATCH_BYTES)} MB por envio.`,
      );
      return;
    }

    let capturedIso: string;
    try {
      capturedIso = clinicDateTimeLocalToUtcIso(capturedAtLocal);
    } catch {
      setError("Data/hora inválida.");
      return;
    }

    setError(null);
    setUploaderOpen(false);
    setUploading(true);

    const total = files.length;
    let uploaded = 0;
    let lastError: string | null = null;

    for (let i = 0; i < files.length; i++) {
      setProgress({
        phase: "uploading",
        current: i,
        total,
        fileName: files[i].name,
      });

      let result: LibraryPhotoUploadResponse;
      try {
        result = await uploadLibraryPhotoViaApi(
          clientId,
          capturedIso,
          files[i],
          i < files.length - 1,
        );
      } catch {
        lastError =
          "Falha no envio (arquivo grande demais ou conexão interrompida).";
        break;
      }

      if (!result.ok) {
        lastError = result.error;
        break;
      }

      uploaded += 1;
    }

    setUploading(false);

    if (lastError) {
      setProgress({
        phase: "error",
        uploaded,
        total,
        message: lastError,
      });
      notifyError(null, lastError);
      if (uploaded > 0) {
        router.refresh();
      }
      return;
    }

    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setProgress({
      phase: "success",
      uploaded: total,
      total,
    });

    notifySuccess(
      total === 1 ? "Foto enviada." : `${total} fotos enviadas.`,
    );
    router.refresh();
  }

  const batchMb =
    files.length > 0 ? formatMegabytes(totalBytes(files)) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Enviar fotos</h3>
          {!uploaderOpen && !uploading ? (
            <p className="mt-0.5 text-xs text-ink-muted">
              JPG, PNG ou WebP — até {formatMegabytes(MAX_PHOTO_BATCH_BYTES)} MB
              por envio.
            </p>
          ) : null}
        </div>
        {!uploading ? (
          <button
            type="button"
            onClick={() => setUploaderOpen((o) => !o)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              uploaderOpen
                ? "bg-muted text-ink"
                : "bg-brand text-white hover:brightness-95",
            )}
            aria-expanded={uploaderOpen}
          >
            {uploaderOpen ? (
              <X className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            )}
            {uploaderOpen ? "Fechar" : "Enviar fotos"}
          </button>
        ) : null}
      </div>

      <PhotoUploadProgressCard state={progress} onDismiss={dismissProgress} />

      {uploaderOpen && !uploading ? (
        <section className="rounded-[1.75rem] border border-line/80 bg-muted/20 p-6 shadow-inner">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="library_captured_at">Data e hora da captura</Label>
              <div className="flex flex-wrap items-center gap-2">
                <ClinicDateTimePicker
                  id="library_captured_at"
                  value={capturedAtLocal}
                  onChange={setCapturedAtLocal}
                />
                <Button type="button" variant="ghost" size="sm" onClick={useToday}>
                  Usar data de hoje
                </Button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="library_files">Imagens</Label>
              <input
                ref={fileInputRef}
                id="library_files"
                type="file"
                accept={PHOTO_ACCEPT}
                multiple
                className="sr-only"
                onChange={(e) => onFilesChange(e.target.files)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Selecionar imagens
                </Button>
                <span className="text-xs text-ink-muted">
                  Sem limite por arquivo — máx.{" "}
                  {formatMegabytes(MAX_PHOTO_BATCH_BYTES)} MB no total do lote.
                </span>
              </div>
              {files.length > 0 ? (
                <p className="text-xs text-ink-muted">
                  {files.length} arquivo{files.length === 1 ? "" : "s"} —{" "}
                  {batchMb} MB no total.
                </p>
              ) : (
                <p className="text-xs text-ink-muted">
                  Selecione uma ou mais imagens para enviar.
                </p>
              )}
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {files.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Limpar seleção
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={files.length === 0}
            >
              <Upload className="h-4 w-4" />
              Enviar fotos
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
