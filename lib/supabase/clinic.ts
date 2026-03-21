import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { CLINIC_SCHEMA } from "./schema";

/** Acesso tipado ao schema `clinic` (domínio da clínica + RLS por tenant). */
export function clinic(client: SupabaseClient<Database>) {
  return client.schema(CLINIC_SCHEMA);
}
