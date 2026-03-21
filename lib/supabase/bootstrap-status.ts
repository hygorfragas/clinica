import { parseBootstrapStatus } from "@/lib/bootstrap";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getBootstrapStatusServer(): Promise<{
  signupOpen: boolean;
  hasPlatformSuperAdmin: boolean;
  rpcUnavailable: boolean;
}> {
  if (!isSupabasePublicEnvConfigured()) {
    return {
      signupOpen: false,
      hasPlatformSuperAdmin: false,
      rpcUnavailable: true,
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("clinic_bootstrap_status");

  if (error) {
    console.error("clinic_bootstrap_status:", error.message);
    return {
      signupOpen: false,
      hasPlatformSuperAdmin: false,
      rpcUnavailable: true,
    };
  }

  const b = parseBootstrapStatus(data);
  return { ...b, rpcUnavailable: false };
}
