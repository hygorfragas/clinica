import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const providerSchema = z.object({
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1),
  redirectUri: z.string().trim().url(),
  syncSecret: z.string().trim().min(24),
});

export type GoogleProviderSettings = z.infer<typeof providerSchema>;

export type GoogleProviderKey =
  | "clientId"
  | "clientSecret"
  | "redirectUri"
  | "syncSecret";

export async function loadGoogleProviderSettings(
  supabase: Client,
  tenantId: string,
): Promise<
  | {
      configured: true;
      settings: GoogleProviderSettings;
      missingKeys: [];
    }
  | {
      configured: false;
      settings: null;
      missingKeys: GoogleProviderKey[];
    }
> {
  const { data } = await supabase
    .schema("clinic")
    .from("calendar_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const settings = (data ?? null) as Record<string, unknown> | null;

  const raw = {
    clientId: (settings?.google_oauth_client_id as string | undefined) ?? "",
    clientSecret:
      (settings?.google_oauth_client_secret as string | undefined) ?? "",
    redirectUri:
      (settings?.google_oauth_redirect_uri as string | undefined) ?? "",
    syncSecret: (settings?.google_sync_secret as string | undefined) ?? "",
  };

  const parsed = providerSchema.safeParse(raw);
  if (parsed.success) {
    return { configured: true, settings: parsed.data, missingKeys: [] };
  }

  const issues = new Set(
    parsed.error.issues.map((i) => String(i.path[0] ?? "") as GoogleProviderKey),
  );
  const allKeys: GoogleProviderKey[] = [
    "clientId",
    "clientSecret",
    "redirectUri",
    "syncSecret",
  ];
  const missingKeys = allKeys.filter((k) => issues.has(k));

  return { configured: false, settings: null, missingKeys };
}
