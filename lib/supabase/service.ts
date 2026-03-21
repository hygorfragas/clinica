import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Apenas rotas/API server-side com variável de ambiente segura. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Defina SUPABASE_SERVICE_ROLE_KEY no servidor para convites com service role.",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
