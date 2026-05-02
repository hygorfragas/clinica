import type { ReactNode } from "react";
import { ConfiguracoesSubnav } from "@/components/configuracoes/configuracoes-subnav";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";

export default async function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUserFromServerCookies();
  const showClinicAppearance = Boolean(
    user?.tenantId && (user.role === "owner" || user.role === "clinic_admin"),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <ConfiguracoesSubnav showClinicAppearance={showClinicAppearance} />
      {children}
    </div>
  );
}
