"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addEvolution } from "@/lib/clients/record-actions";

const textareaClass =
  "min-h-[7rem] w-full resize-y rounded-md border border-line bg-[#f3f1ee] px-3 py-2 text-sm text-ink shadow-none transition-colors placeholder:text-ink-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

type Evo = {
  id: string;
  body: string;
  created_at: string;
};

export function PacienteEvolucaoPanel({
  clientId,
  entries,
}: {
  clientId: string;
  entries: Evo[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<{ body: string }>({
    defaultValues: { body: "" },
  });

  function onSubmit(values: { body: string }) {
    setServerError(null);
    startTransition(async () => {
      const result = await addEvolution(clientId, values.body);
      if (result.ok) {
        form.reset({ body: "" });
        router.refresh();
        return;
      }
      setServerError(result.error);
    });
  }

  return (
    <div className="space-y-10">
      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Nova entrada
        </h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="evo_body">Evolução clínica</Label>
            <textarea
              id="evo_body"
              className={textareaClass}
              placeholder="Sessão, reação, orientações, próximos passos…"
              {...form.register("body")}
            />
          </div>
          {serverError && (
            <p className="text-sm text-danger" role="alert">
              {serverError}
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
              <li
                key={e.id}
                className="rounded-2xl bg-surface/90 p-5 shadow-sm ring-1 ring-line/70"
              >
                <p className="text-xs font-medium text-ink-subtle">
                  {new Date(e.created_at).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {e.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
