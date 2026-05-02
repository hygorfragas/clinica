import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { postLoginPathForClinicProfile } from "@/lib/auth/post-login-path";

/**
 * Área administrativa da plataforma: apenas super administrador global.
 * Quem tem só acesso à clínica não deve ver rotas de criação de instâncias.
 */
export default async function PlataformaLayout({
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

  if (landing !== "/plataforma") {
    redirect("/inicio");
  }

  return children;
}
