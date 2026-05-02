import { CLINIC_SCHEMA } from "./schema";
import type { createServerSupabaseClient } from "./server";

type SupabaseSchemaClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Acesso tipado ao schema `clinic` (domínio da clínica + RLS por tenant). */
export function clinic(client: SupabaseSchemaClient) {
  return client.schema(CLINIC_SCHEMA);
}
