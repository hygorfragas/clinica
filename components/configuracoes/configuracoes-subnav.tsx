"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/configuracoes/agenda", label: "Agenda" },
  { href: "/configuracoes/anamnese", label: "Anamnese" },
  { href: "/configuracoes/contratos", label: "Contratos" },
  { href: "/configuracoes/profissional", label: "Profissional" },
] as const;

export function ConfiguracoesSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-full bg-muted/70 p-1.5 ring-1 ring-line/60"
      aria-label="Seções de configurações"
    >
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-all",
              active
                ? "bg-surface text-brand shadow-sm ring-1 ring-brand/20"
                : "text-ink-muted hover:bg-surface/80 hover:text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
