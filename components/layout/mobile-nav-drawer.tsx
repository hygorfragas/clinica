"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNavDrawer({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fecha o drawer ao mudar de rota.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC fecha. Bloqueia scroll do body quando aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-muted hover:text-ink md:hidden"
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {/* Portal no body: escapa do stacking context do header (backdrop-blur),
          que prendia o drawer atrás do banner sticky da agenda. z alto cobre
          banner (z-30) e qualquer overlay da página. */}
      {mounted &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[100] md:hidden",
              open ? "pointer-events-auto" : "pointer-events-none",
            )}
            aria-hidden={!open}
          >
            <div
              className={cn(
                "absolute inset-0 bg-black/40 transition-opacity",
                open ? "opacity-100" : "opacity-0",
              )}
              onClick={() => setOpen(false)}
            />
            <aside
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className={cn(
                "absolute inset-y-0 left-0 flex w-[min(17rem,86vw)] flex-col bg-muted shadow-sidebar transition-transform duration-200 ease-out",
                open ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
                <span className="text-sm font-semibold tracking-tight text-ink">
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-canvas hover:text-ink"
                  aria-label="Fechar menu"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-2">
                {children}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
