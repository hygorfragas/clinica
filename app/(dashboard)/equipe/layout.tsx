import type { ReactNode } from "react";
import { requireClinicAdminPage } from "@/lib/auth/page-guards";

/** Equipe (profissionais): apenas clinic_admin do tenant. */
export default async function EquipeLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireClinicAdminPage();
  return children;
}
