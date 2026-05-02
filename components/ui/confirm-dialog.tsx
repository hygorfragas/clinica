"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { notifyError } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmButtonRef.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
    };
  }, [open, pending, onOpenChange]);

  const handleConfirm = useCallback(async () => {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      notifyError(err);
    } finally {
      setPending(false);
    }
  }, [pending, onConfirm, onOpenChange]);

  if (!open || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !pending && onOpenChange(false)}
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl border border-line/70 bg-surface p-6 shadow-[var(--shadow-panel)]",
        )}
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold tracking-tight text-ink"
        >
          {title}
        </h2>
        {description ? (
          <div className="mt-2 text-sm text-ink-muted">{description}</div>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            type="button"
            size="sm"
            variant={destructive ? "primary" : "primary"}
            className={cn(
              destructive
                ? "bg-red-600 text-white shadow-none hover:bg-red-700"
                : undefined,
            )}
            onClick={handleConfirm}
            loading={pending}
          >
            {pending ? "Processando..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export function useConfirmDialog() {
  const [state, setState] = useState<
    | (Omit<ConfirmDialogProps, "open" | "onOpenChange"> & { key: number })
    | null
  >(null);

  const confirm = useCallback(
    (opts: Omit<ConfirmDialogProps, "open" | "onOpenChange">) => {
      setState({ ...opts, key: Date.now() });
    },
    [],
  );

  const close = useCallback(() => setState(null), []);

  const element = state
    ? (() => {
        const { key, ...rest } = state;
        return (
          <ConfirmDialog
            key={key}
            open
            onOpenChange={(next) => !next && close()}
            {...rest}
          />
        );
      })()
    : null;

  return { confirm, element };
}
