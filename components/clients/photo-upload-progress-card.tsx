"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PhotoUploadProgressState =
  | {
      phase: "uploading";
      current: number;
      total: number;
      fileName?: string;
    }
  | { phase: "success"; uploaded: number; total: number }
  | {
      phase: "error";
      uploaded: number;
      total: number;
      message: string;
    };

type Props = {
  state: PhotoUploadProgressState | null;
  onDismiss: () => void;
};

export function PhotoUploadProgressCard({ state, onDismiss }: Props) {
  useEffect(() => {
    if (state?.phase !== "success") return;
    const timer = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timer);
  }, [state, onDismiss]);

  const progressValue =
    state?.phase === "uploading"
      ? state.total > 0
        ? (state.current / state.total) * 100
        : 0
      : state?.phase === "success"
        ? 100
        : state?.phase === "error" && state.total > 0
          ? (state.uploaded / state.total) * 100
          : 0;

  return (
    <AnimatePresence>
      {state ? (
        <motion.div
          key="photo-upload-progress"
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 shadow-[var(--shadow-lift)]",
            state.phase === "error" && "border-danger/30 bg-red-50/80",
            state.phase === "success" && "border-brand/40",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              {state.phase === "uploading" ? (
                <>
                  <p className="text-sm font-medium text-ink">
                    Enviando foto{" "}
                    <span className="tabular-nums">{state.current + 1}</span> de{" "}
                    <span className="tabular-nums">{state.total}</span>
                  </p>
                  {state.fileName ? (
                    <p className="truncate text-xs text-ink-muted">{state.fileName}</p>
                  ) : null}
                </>
              ) : null}

              {state.phase === "success" ? (
                <div className="flex items-center gap-2">
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </motion.span>
                  <p className="text-sm font-medium text-ink">
                    {state.uploaded === 1
                      ? "1 foto enviada com sucesso."
                      : `${state.uploaded} fotos enviadas com sucesso.`}
                  </p>
                </div>
              ) : null}

              {state.phase === "error" ? (
                <div className="flex items-start gap-2">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-danger"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {state.uploaded > 0
                        ? `${state.uploaded} de ${state.total} foto${state.total === 1 ? "" : "s"} enviada${state.uploaded === 1 ? "" : "s"}.`
                        : "Nenhuma foto foi enviada."}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{state.message}</p>
                  </div>
                </div>
              ) : null}

              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progressValue)}
              >
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    state.phase === "error" ? "bg-danger/70" : "bg-brand",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressValue}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
            </div>

            {state.phase === "error" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={onDismiss}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
