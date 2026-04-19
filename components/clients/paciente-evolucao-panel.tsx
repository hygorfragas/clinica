"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addEvolutionRich,
  deleteEvolution,
  uploadEvolutionPhoto,
} from "@/lib/clients/evolution-actions";

const textareaClass =
  "min-h-[7rem] w-full resize-y rounded-md border border-line bg-[#f3f1ee] px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35";

const selectClass =
  "flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm";

type EvolutionPhoto = {
  id: string;
  url: string | null;
  caption: string | null;
  taken_at: string | null;
};

export type EvolutionEntry = {
  id: string;
  body: string;
  created_at: string;
  procedure_id: string | null;
  procedure_name: string | null;
  purchase_id: string | null;
  session_number: number | null;
  photos: EvolutionPhoto[];
};

type Procedure = { id: string; name: string };
type Purchase = {
  id: string;
  title: string;
  purchased_at: string;
  procedure_id: string | null;
};

export function PacienteEvolucaoPanel({
  clientId,
  entries,
  procedures,
  purchases,
}: {
  clientId: string;
  entries: EvolutionEntry[];
  procedures: Procedure[];
  purchases: Purchase[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [procedureId, setProcedureId] = useState<string>("");
  const [purchaseId, setPurchaseId] = useState<string>("");
  const [sessionNumber, setSessionNumber] = useState<string>("");

  const purchasesForProcedure = purchaseId
    ? purchases.filter((p) => p.id === purchaseId)
    : procedureId
      ? purchases.filter((p) => p.procedure_id === procedureId)
      : purchases;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("Escreva a evolução.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addEvolutionRich(clientId, {
        body: body.trim(),
        procedureId: procedureId || null,
        purchaseId: purchaseId || null,
        sessionNumber: sessionNumber ? Number(sessionNumber) : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setSessionNumber("");
      router.refresh();
    });
  }

  function onRemove(id: string) {
    if (!confirm("Excluir esta entrada de evolução?")) return;
    startTransition(async () => {
      const result = await deleteEvolution(clientId, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Nova entrada
        </h2>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="evo_body">Evolução clínica</Label>
            <textarea
              id="evo_body"
              className={textareaClass}
              placeholder="Sessão, reação, orientações, próximos passos…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="evo_procedure">Procedimento</Label>
              <select
                id="evo_procedure"
                className={selectClass}
                value={procedureId}
                onChange={(e) => {
                  setProcedureId(e.target.value);
                  setPurchaseId("");
                }}
              >
                <option value="">—</option>
                {procedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="evo_purchase">Compra vinculada</Label>
              <select
                id="evo_purchase"
                className={selectClass}
                value={purchaseId}
                onChange={(e) => setPurchaseId(e.target.value)}
              >
                <option value="">—</option>
                {purchasesForProcedure.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ·{" "}
                    {new Date(p.purchased_at).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="evo_session">Sessão nº</Label>
              <Input
                id="evo_session"
                type="number"
                min={1}
                value={sessionNumber}
                onChange={(e) => setSessionNumber(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Registrando…" : "Registrar evolução"}
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Histórico
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhuma evolução registrada ainda.
          </p>
        ) : (
          <ul className="space-y-4">
            {entries.map((e) => (
              <EvolutionItem
                key={e.id}
                clientId={clientId}
                entry={e}
                onRemove={() => onRemove(e.id)}
                disabled={pending}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EvolutionItem({
  clientId,
  entry,
  onRemove,
  disabled,
}: {
  clientId: string;
  entry: EvolutionEntry;
  onRemove: () => void;
  disabled: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  function onAttachPhoto() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecione uma imagem.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    if (caption.trim()) fd.set("caption", caption.trim());
    startTransition(async () => {
      const result = await uploadEvolutionPhoto(clientId, entry.id, fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <li className="rounded-2xl bg-surface/90 p-5 shadow-sm ring-1 ring-line/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-subtle">
            {new Date(entry.created_at).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {entry.procedure_name ? (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand">
                {entry.procedure_name}
              </span>
            ) : null}
            {entry.session_number ? (
              <span className="rounded-full bg-muted px-2 py-0.5">
                Sessão {entry.session_number}
              </span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-danger"
          onClick={onRemove}
          disabled={disabled || pending}
        >
          Excluir
        </Button>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {entry.body}
      </p>

      {entry.photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {entry.photos.map((p) =>
            p.url ? (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-lg ring-1 ring-line/60"
              >
                <Image
                  src={p.url}
                  alt={p.caption ?? "Foto da evolução"}
                  fill
                  sizes="200px"
                  className="object-cover transition group-hover:scale-[1.02]"
                  unoptimized
                />
              </a>
            ) : null,
          )}
        </div>
      ) : null}

      <details className="mt-4 rounded-lg bg-muted/30 p-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-ink-subtle">
          Anexar foto a esta evolução
        </summary>
        <div className="mt-3 space-y-2">
          <Input
            type="text"
            placeholder="Legenda (opcional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <Input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button
            type="button"
            size="sm"
            onClick={onAttachPhoto}
            disabled={pending}
          >
            {pending ? "Enviando…" : "Adicionar foto"}
          </Button>
        </div>
      </details>
    </li>
  );
}
