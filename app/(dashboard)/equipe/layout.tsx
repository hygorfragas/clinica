import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { postLoginPathForClinicProfile } from "@/lib/auth/post-login-path";

/** Equipe (profissionais): apenas owner ou clinic_admin do tenant. */
export default async function EquipeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUserFromServerCookies();
  if (!user) {
    redirect("/login");
  }

  const landing = postLoginPathForClinicProfile({
    role: user.role,
    tenant_id: user.tenantId,
  });
  const isTenantManager = Boolean(
    user.tenantId && (user.role === "owner" || user.role === "clinic_admin"),
  );

  if (!isTenantManager) {
    if (landing === "/plataforma") {
      redirect("/plataforma");
    }
    redirect("/inicio");
  }

  return children;
}
