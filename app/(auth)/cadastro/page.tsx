import { redirect } from "next/navigation";
import { CadastroMigrationRequired } from "@/components/setup/cadastro-migration-required";
import { MissingSupabaseEnvCard } from "@/components/setup/missing-supabase-env-card";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { getBootstrapStatusServer } from "@/lib/supabase/bootstrap-status";
import { CadastroSuperAdminForm } from "./cadastro-form";

export default async function CadastroPage() {
  if (!isSupabasePublicEnvConfigured()) {
    return <MissingSupabaseEnvCard />;
  }

  const status = await getBootstrapStatusServer();

  if (status.rpcUnavailable) {
    return <CadastroMigrationRequired />;
  }

  if (!status.signupOpen) {
    redirect("/login");
  }

  return <CadastroSuperAdminForm />;
}
