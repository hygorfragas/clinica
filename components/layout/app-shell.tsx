import Link from "next/link";
import { Building2, CalendarDays } from "lucide-react";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { cn } from "@/lib/utils";

type Variant = "clinic" | "platform";

export function AppShell({
  variant,
  userEmail,
  children,
}: {
  variant: Variant;
  userEmail: string;
  children: React.ReactNode;
}) {
  const nav =
    variant === "platform"
      ? [{ href: "/plataforma", label: "Clínicas", icon: Building2 }]
      : [
          { href: "/agenda", label: "Agenda do dia", icon: CalendarDays },
        ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-surface md:w-56 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center border-b border-line px-4 md:h-16">
          <span className="text-sm font-semibold tracking-tight text-ink">
            Agenda clínica
          </span>
        </div>
        <nav className="flex gap-1 p-3 md:flex-col" aria-label="Principal">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-muted hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden p-3 pt-0 md:block">
          <p className="mb-2 truncate px-1 text-xs text-ink-subtle" title={userEmail}>
            {userEmail}
          </p>
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b border-line bg-canvas px-4 md:hidden">
          <span className="sr-only">{userEmail}</span>
          <SignOutButton />
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
