import { MissingSupabaseEnvCard } from "@/components/setup/missing-supabase-env-card";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { getBootstrapStatusServer } from "@/lib/supabase/bootstrap-status";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (!isSupabasePublicEnvConfigured()) {
    return <MissingSupabaseEnvCard />;
  }

  const { signupOpen } = await getBootstrapStatusServer();
  return <LoginForm signupOpen={signupOpen} />;
}
