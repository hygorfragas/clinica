import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { ClinicNav } from "@/components/layout/clinic-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { cn } from "@/lib/utils";

type Variant = "clinic" | "platform";

export function AppShell({
  variant,
  userEmail,
  showEquipe,
  children,
}: {
  variant: Variant;
  userEmail: string;
  /** Owner / clinic_admin: gestão de profissionais no tenant */
  showEquipe?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside
        className={cn(
          "border-b border-line/60 bg-muted shadow-sidebar backdrop-blur-sm md:w-[17rem] md:shrink-0 md:border-b-0 md:border-r-0 md:py-8",
        )}
      >
        <div className="flex h-14 items-center border-b border-line px-4 md:hidden md:h-16">
          <span className="text-sm font-semibold tracking-tight text-ink">
            {variant === "platform" ? "Plataforma" : "Sua clínica"}
          </span>
        </div>
        <div className="flex flex-col px-4 pb-4 pt-2 md:min-h-screen md:px-5 md:pb-8 md:pt-0">
          {variant === "platform" ? (
            <>
              <div className="mb-8 px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-subtle">
                  Administração
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-brand">
                  Plataforma
                </p>
              </div>
              <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
                <Link
                  href="/plataforma"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-muted/80 hover:text-ink"
                >
                  <Building2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Clínicas
                </Link>
                <Link
                  href="/plataforma/usuarios"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-muted/80 hover:text-ink"
                >
                  <Users className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  Usuários
                </Link>
              </nav>
            </>
          ) : (
            <ClinicNav showEquipe={showEquipe} />
          )}
          <div className="mt-auto hidden border-t border-line/50 pt-6 md:block">
            <p
              className="mb-2 truncate px-1 text-xs text-ink-subtle"
              title={userEmail}
            >
              {userEmail}
            </p>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col bg-canvas">
        <header className="flex h-14 items-center justify-end border-b border-line/60 bg-canvas/95 px-4 backdrop-blur-md md:hidden">
          <span className="sr-only">{userEmail}</span>
          <SignOutButton />
        </header>
        <main className="flex-1 p-4 md:px-10 md:py-10 lg:px-14">{children}</main>
      </div>
    </div>
  );
}
