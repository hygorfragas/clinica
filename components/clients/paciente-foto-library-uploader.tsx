"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_PHOTOS_PER_BATCH } from "@/lib/clinical/body-regions";
import { uploadPatientLibraryPhotos } from "@/lib/clients/record-actions";
import {
  clinicDateTimeLocalToUtcIso,
  clinicNowDateTimeLocalValue,
} from "@/lib/dates";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

type Props = {
  clientId: string;
};

export function PacienteFotoLibraryUploader({ clientId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedAtLocal, setCapturedAtLocal] = useState(() =>
    clinicNowDateTimeLocalValue(),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);

  function useToday() {
    setCapturedAtLocal(clinicNowDateTimeLocalValue());
  }

  function onFilesChange(list: FileList | null) {
    if (!list) {
      setFiles([]);
      return;
    }
    const picked = Array.from(list);
    if (picked.length > MAX_PHOTOS_PER_BATCH) {
      setError(`Máximo de ${MAX_PHOTOS_PER_BATCH} fotos por envio.`);
      setFiles(picked.slice(0, MAX_PHOTOS_PER_BATCH));
      return;
    }
    setError(null);
    setFiles(picked);
  }

  function submit() {
    if (!capturedAtLocal.trim()) {
      setError("Informe a data e hora da captura.");
      return;
    }
    if (files.length === 0) {
      setError("Selecione ao menos uma imagem.");
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
    setUploadLabel(`Enviando ${files.length} foto${files.length === 1 ? "" : "s"}…`);

    const fd = new FormData();
    fd.set("captured_at", capturedIso);
    for (const file of files) {
      fd.append("files", file);
    }

    startUpload(async () => {
      const result = await uploadPatientLibraryPhotos(clientId, fd);
      setUploadLabel(null);
      if (result.ok) {
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        notifySuccess(
          files.length === 1
            ? "Foto enviada."
            : `${files.length} fotos enviadas.`,
        );
        router.refresh();
        return;
      }
      setError(result.error);
      notifyError(null, result.error);
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-line/80 bg-muted/20 p-6 shadow-inner">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Enviar fotos</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
            Defina a data e hora da captura e selecione uma ou mais imagens. As
            fotos aparecem na biblioteca junto com envios de evolução e cadastro.
          </p>
        </div>
        <ImagePlus className="h-8 w-8 shrink-0 text-ink-subtle" aria-hidden />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="library_captured_at">Data e hora da captura</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="library_captured_at"
              type="datetime-local"
              value={capturedAtLocal}
              onChange={(e) => setCapturedAtLocal(e.target.value)}
              disabled={uploading}
              required
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={useToday}
              disabled={uploading}
            >
              Usar data de hoje
            </Button>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="library_files">Imagens</Label>
          <Input
            ref={fileInputRef}
            id="library_files"
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => onFilesChange(e.target.files)}
          />
          {files.length > 0 ? (
            <p className="text-xs text-ink-muted">
              {files.length} arquivo{files.length === 1 ? "" : "s"} selecionado
              {files.length === 1 ? "" : "s"} (máx. {MAX_PHOTOS_PER_BATCH}).
            </p>
          ) : (
            <p className="text-xs text-ink-muted">
              Formatos de imagem aceitos; até {MAX_PHOTOS_PER_BATCH} por envio.
            </p>
          )}
        </div>
      </div>

      {uploading && uploadLabel ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-ink">{uploadLabel}</p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuetext={uploadLabel}
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
          </div>
        </div>
      ) : null}

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
            disabled={uploading}
          >
            Limpar seleção
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={submit}
          disabled={files.length === 0 || uploading}
          loading={uploading}
          loadingLabel="Enviando..."
        >
          <Upload className="h-4 w-4" />
          Enviar fotos
        </Button>
      </div>
    </section>
  );
}
