import { createServerClient } from "@supabase/ssr";
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
  return createServerClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Service-role client em rotas server-side não persiste sessão/cookies.
      },
    },
  });
}
