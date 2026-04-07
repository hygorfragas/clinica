"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteClinicalPhoto,
  uploadClinicalPhoto,
} from "@/lib/clients/record-actions";

export type FotoComUrl = {
  id: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  url: string | null;
};

export function PacienteFotosPanel({
  clientId,
  fotos,
}: {
  clientId: string;
  fotos: FotoComUrl[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [takenAt, setTakenAt] = useState("");

  function uploadSelected() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Escolha uma imagem.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    if (caption.trim()) fd.set("caption", caption.trim());
    if (takenAt) fd.set("taken_at", takenAt);

    startTransition(async () => {
      const result = await uploadClinicalPhoto(clientId, fd);
      if (result.ok) {
        setCaption("");
        setTakenAt("");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
        return;
      }
      setError(result.error);
    });
  }

  function remove(id: string) {
    if (!confirm("Remover esta foto do prontuário?")) return;
    startTransition(async () => {
      const result = await deleteClinicalPhoto(clientId, id);
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(result.error);
    });
  }

  return (
    <div className="space-y-10">
      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Enviar foto (evolução / registro clínico)
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          JPG, PNG ou WebP até 12 MB. Armazenamento privado com URL assinada.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="foto_file">Arquivo</Label>
            <Input
              id="foto_file"
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="foto_caption">Legenda (opcional)</Label>
            <Input
              id="foto_caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex.: Antes — protocolo X"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="foto_taken">Data da foto (opcional)</Label>
            <Input
              id="foto_taken"
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button
          type="button"
          className="mt-6"
          disabled={pending}
          onClick={uploadSelected}
        >
          {pending ? "Enviando…" : "Enviar foto"}
        </Button>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Galeria
        </h2>
        {fotos.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">Nenhuma foto ainda.</p>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((f) => (
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
                      Não foi possível gerar pré-visualização.
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <p className="text-xs text-ink-subtle">
                    {new Date(f.created_at).toLocaleString("pt-BR")}
                    {f.taken_at
                      ? ` · ref. ${new Date(f.taken_at).toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                  {f.caption && (
                    <p className="text-sm text-ink">{f.caption}</p>
                  )}
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
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
