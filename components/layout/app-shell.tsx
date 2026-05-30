import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { ClinicNav } from "@/components/layout/clinic-nav";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { AgendaNotificationsProvider } from "@/components/agenda/agenda-notifications-provider";
import { NextAppointmentBanner } from "@/components/agenda/next-appointment-banner";

type Variant = "clinic" | "platform";

export function AppShell({
  variant,
  userEmail,
  isClinicAdmin,
  tenantId,
  children,
}: {
  variant: Variant;
  userEmail: string;
  /** Admin da clínica: libera Financeiro, Equipe e abas restritas de Configurações */
  isClinicAdmin?: boolean;
  /** Tenant ativo (apenas clínicas) para habilitar notificações da agenda */
  tenantId?: string | null;
  children: React.ReactNode;
}) {
  const shell = (
    <AppShellBody
      variant={variant}
      userEmail={userEmail}
      isClinicAdmin={isClinicAdmin}
      showAgendaBanner={variant === "clinic" && !!tenantId}
    >
      {children}
    </AppShellBody>
  );

  if (variant === "clinic" && tenantId) {
    return (
      <AgendaNotificationsProvider tenantId={tenantId}>
        {shell}
      </AgendaNotificationsProvider>
    );
  }

  return shell;
}

function SidebarContent({
  variant,
  userEmail,
  isClinicAdmin,
  showSignOutFooter,
}: {
  variant: Variant;
  userEmail: string;
  isClinicAdmin?: boolean;
  /** Mostra rodapé com email + sign-out (usado no drawer mobile e sidebar desktop). */
  showSignOutFooter: boolean;
}) {
  return (
    <>
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
        <ClinicNav isClinicAdmin={isClinicAdmin} />
      )}
      {showSignOutFooter ? (
        <div className="mt-auto border-t border-line/50 pt-6">
          <p
            className="mb-2 truncate px-1 text-xs text-ink-subtle"
            title={userEmail}
          >
            {userEmail}
          </p>
          <SignOutButton />
        </div>
      ) : null}
    </>
  );
}

function AppShellBody({
  variant,
  userEmail,
  isClinicAdmin,
  showAgendaBanner,
  children,
}: {
  variant: Variant;
  userEmail: string;
  isClinicAdmin?: boolean;
  showAgendaBanner: boolean;
  children: React.ReactNode;
}) {
  const drawerLabel = variant === "platform" ? "Plataforma" : "Sua clínica";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar desktop (md+) */}
      <aside className="hidden border-line/60 bg-muted shadow-sidebar backdrop-blur-sm md:flex md:w-[17rem] md:shrink-0 md:py-8">
        <div className="flex w-full flex-col px-5 pb-8 md:min-h-screen">
          <SidebarContent
            variant={variant}
            userEmail={userEmail}
            isClinicAdmin={isClinicAdmin}
            showSignOutFooter
          />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-canvas">
        {showAgendaBanner ? <NextAppointmentBanner /> : null}

        {/* Topbar mobile */}
        <header className="flex h-14 items-center justify-between gap-2 border-b border-line/60 bg-canvas/95 px-2 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-1">
            <MobileNavDrawer label={drawerLabel}>
              <SidebarContent
                variant={variant}
                userEmail={userEmail}
                isClinicAdmin={isClinicAdmin}
                showSignOutFooter
              />
            </MobileNavDrawer>
            <span className="text-sm font-semibold tracking-tight text-ink">
              {drawerLabel}
            </span>
          </div>
          <span className="sr-only">{userEmail}</span>
          <SignOutButton />
        </header>

        <main className="min-w-0 flex-1 p-4 md:px-10 md:py-10 lg:px-14">
          {children}
        </main>
      </div>
    </div>
  );
}
