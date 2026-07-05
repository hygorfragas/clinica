"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InteractiveRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[interactive-pdf] erro de rota:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="max-w-lg space-y-5 rounded-2xl bg-surface p-8 shadow-lift ring-1 ring-line">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-destructive/10 p-2.5 ring-1 ring-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-ink">
              O editor do PDF foi interrompido
            </h1>
            <p className="text-sm text-ink-muted">
              O rascunho costuma estar salvo automaticamente. Tente recarregar o
              editor; se o problema continuar, volte à lista e abra a ficha de
              novo.
            </p>
          </div>
        </div>
        {error.digest ? (
          <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-ink-subtle">
            Código de referência:{" "}
            <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            Tentar novamente
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (typeof window !== "undefined") window.history.back();
            }}
          >
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
