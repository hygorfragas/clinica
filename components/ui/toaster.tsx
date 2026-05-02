"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-line/70 !bg-surface !text-ink !shadow-[var(--shadow-lift)] !font-sans",
          title: "!text-sm !font-semibold",
          description: "!text-xs !text-ink-muted",
          actionButton:
            "!bg-brand !text-white !rounded-lg !text-xs !font-semibold !px-3 !py-1.5",
          cancelButton:
            "!bg-muted !text-ink !rounded-lg !text-xs !font-medium !px-3 !py-1.5",
          error:
            "!border-red-300/80 !bg-red-50 !text-red-900 dark:!bg-red-950/50 dark:!text-red-100 dark:!border-red-900/60",
          success:
            "!border-brand/30 !bg-brand-soft !text-ink",
          warning:
            "!border-amber-300/70 !bg-amber-50 !text-amber-900",
          info: "!border-line/70 !bg-surface !text-ink",
        },
      }}
    />
  );
}
