"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EvolucaoInterativaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[evolucao.interativa] erro de rota:", error);
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
              Não foi possível abrir a ficha interativa
            </h1>
            <p className="text-sm text-ink-muted">
              O editor de evolução ou o painel de fotos encontrou um erro
              inesperado. Recarregar costuma resolver. Se estava enviando fotos,
              tente menos imagens por vez ou arquivos menores.
            </p>
          </div>
        </div>
        {error.digest ? (
          <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-ink-subtle">
            Código: <span className="font-mono">{error.digest}</span>
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
