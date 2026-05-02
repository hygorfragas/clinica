"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Lock,
  Package,
  Settings,
  ShoppingBag,
  UserCog,
  UsersRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/inicio", label: "Início", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: UsersRound },
  { href: "/orcamentos", label: "Orçamentos", icon: ClipboardList },
  { href: "/vendas", label: "Vendas", icon: ShoppingBag },
  { href: "/estoque", label: "Estoque", icon: Package },
  // Configurações sempre habilitada — controle do que aparece dentro vai pelo subnav
  { href: "/configuracoes/perfil", label: "Configurações", icon: Settings },
] as const;

const linkBase =
  "flex items-center gap-4 rounded-xl px-4 py-3 text-sm transition-all duration-300";

const lockedTitle =
  "Disponível apenas para o(a) administrador(a) da clínica (clinic_admin).";

export function ClinicNav({
  isClinicAdmin,
}: {
  isClinicAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="mb-10 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-subtle">
          Operação
        </p>
        <p className="mt-1 text-xl font-bold tracking-tight text-brand">
          Sua clínica
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5" aria-label="Principal">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/inicio"
              ? pathname === "/inicio"
              : href === "/configuracoes/perfil"
                ? pathname.startsWith("/configuracoes")
                : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                linkBase,
                active
                  ? "border-r-4 border-brand bg-brand/5 font-bold text-brand shadow-sm"
                  : "border-r-4 border-transparent font-medium text-ink-muted hover:bg-brand/5 hover:text-brand",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-95" aria-hidden />
              {label}
            </Link>
          );
        })}

        <NavItem
          href="/financeiro"
          label="Financeiro"
          Icon={Wallet}
          pathname={pathname}
          enabled={!!isClinicAdmin}
        />
        <NavItem
          href="/equipe"
          label="Equipe"
          Icon={UserCog}
          pathname={pathname}
          enabled={!!isClinicAdmin}
        />
      </nav>
    </>
  );
}

function NavItem({
  href,
  label,
  Icon,
  pathname,
  enabled,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  pathname: string;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <span
        className={cn(
          linkBase,
          "mt-1 cursor-not-allowed select-none border-r-4 border-transparent font-medium text-ink-muted/50",
        )}
        aria-disabled="true"
        title={lockedTitle}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 opacity-50" aria-hidden />
        <span className="flex-1">{label}</span>
        <Lock className="h-3.5 w-3.5 opacity-60" aria-hidden />
      </span>
    );
  }

  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        linkBase,
        "mt-1",
        active
          ? "border-r-4 border-brand bg-brand/5 font-bold text-brand shadow-sm"
          : "border-r-4 border-transparent font-medium text-ink-muted hover:bg-brand/5 hover:text-brand",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 opacity-95" aria-hidden />
      {label}
    </Link>
  );
}
