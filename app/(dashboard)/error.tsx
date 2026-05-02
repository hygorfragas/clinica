"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] erro de rota:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-lg space-y-5 rounded-2xl bg-surface p-8 shadow-lift ring-1 ring-line">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-destructive/10 p-2.5 ring-1 ring-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-ink">
              Algo deu errado nesta tela
            </h1>
            <p className="text-sm text-ink-muted">
              A operação foi interrompida. Você pode tentar novamente ou voltar
              para a página anterior. Se o erro persistir, avise o suporte da
              clínica.
            </p>
          </div>
        </div>
        {error.digest ? (
          <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-ink-subtle">
            Código de referência: <span className="font-mono">{error.digest}</span>
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
