"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PacienteFichaNav({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/pacientes/${clientId}`;

  const items: { href: string; label: string; match: (p: string) => boolean }[] =
    [
      {
        href: base,
        label: "Resumo",
        match: (p) => p === base || p === `${base}/`,
      },
      {
        href: `${base}/anamnese`,
        label: "Anamnese",
        match: (p) => p.startsWith(`${base}/anamnese`),
      },
      {
        href: `${base}/evolucao`,
        label: "Evolução",
        match: (p) => p.startsWith(`${base}/evolucao`),
      },
      {
        href: `${base}/contratos`,
        label: "Contratos",
        match: (p) => p.startsWith(`${base}/contratos`),
      },
      {
        href: `${base}/financeiro`,
        label: "Financeiro",
        match: (p) =>
          p.startsWith(`${base}/financeiro`) ||
          p.startsWith(`${base}/documentos`),
      },
      {
        href: `${base}/anexos`,
        label: "Anexos",
        match: (p) => p.startsWith(`${base}/anexos`),
      },
      {
        href: `${base}/fotos`,
        label: "Fotos",
        match: (p) => p.startsWith(`${base}/fotos`),
      },
      {
        href: `${base}/historico`,
        label: "Histórico",
        match: (p) => p.startsWith(`${base}/historico`),
      },
    ];

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-line/80 pb-3"
      aria-label="Seções da ficha"
    >
      {items.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-brand/12 text-brand ring-1 ring-brand/25"
                : "text-ink-muted hover:bg-muted/50 hover:text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
