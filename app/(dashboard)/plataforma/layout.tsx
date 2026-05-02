import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchClinicProfile,
  isPlatformSuperAdmin,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Área administrativa da plataforma: apenas super administrador global.
 * Quem tem só acesso à clínica não deve ver rotas de criação de instâncias.
 */
export default async function PlataformaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await fetchClinicProfile(supabase, user.id);
  if (!isPlatformSuperAdmin(profile)) {
    redirect("/inicio");
  }
  return children;
}
