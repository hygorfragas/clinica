import { AgendaConfigPanel } from "@/components/configuracoes/agenda-config-panel";
import { requireClinicAdminPage } from "@/lib/auth/page-guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CLINIC_TIMEZONE } from "@/lib/dates";
import { loadGoogleProviderSettings } from "@/lib/google/provider-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    google_connected?: string;
    google_error?: string;
  }>;
};

export default async function ConfiguracoesAgendaPage({ searchParams }: PageProps) {
  const profile = await requireClinicAdminPage();
  const supabase = await createServerSupabaseClient();

  const tenantId = profile.tenant_id as string;
  const canManage = true;

  const [settingsRes, connectionRes, syncStateRes, providerRes] = await Promise.all([
    supabase
      .schema("clinic")
      .from("calendar_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .schema("clinic")
      .from("google_calendar_connections")
      .select("id, google_account_email, calendar_id, created_at")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle(),
    supabase
      .schema("clinic")
      .from("google_calendar_sync_state")
      .select("last_synced_at, last_error")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle(),
    loadGoogleProviderSettings(supabase, tenantId),
  ]);

  const rawSettings = settingsRes.data;
  const rawSettingsAny = (rawSettings ?? null) as Record<string, unknown> | null;
  const settings = {
    googleSyncMode: (rawSettings?.google_sync_mode as
      | "off"
      | "pull"
      | "webhook"
      | undefined) ?? "off",
    pullIntervalMinutes: (rawSettings?.pull_interval_minutes as number | undefined) ?? 5,
    defaultSlotMinutes: (rawSettings?.default_slot_minutes as number | undefined) ?? 30,
    defaultCalendarId: (rawSettings?.default_calendar_id as string | null | undefined) ?? null,
    timezone: (rawSettings?.timezone as string | undefined) ?? CLINIC_TIMEZONE,
    businessHours:
      (rawSettings?.business_hours as {
        start: string;
        end: string;
        days: number[];
      } | null) ?? {
        start: "08:00",
        end: "19:00",
        days: [1, 2, 3, 4, 5, 6],
      },
    googleCredentials: {
      clientId: canManage
        ? ((rawSettingsAny?.google_oauth_client_id as string | undefined) ?? "")
        : "",
      clientSecret: canManage
        ? ((rawSettingsAny?.google_oauth_client_secret as string | undefined) ?? "")
        : "",
      redirectUri: canManage
        ? ((rawSettingsAny?.google_oauth_redirect_uri as string | undefined) ?? "")
        : "",
      syncSecret: canManage
        ? ((rawSettingsAny?.google_sync_secret as string | undefined) ?? "")
        : "",
    },
  };

  const resolvedSearch = await searchParams;

  return (
    <AgendaConfigPanel
      settings={settings}
      connection={connectionRes.data ?? null}
      syncState={syncStateRes.data ?? null}
      canManage={canManage}
      googleProviderConfigured={providerRes.configured}
      callbackParams={{
        success: resolvedSearch?.google_connected === "1",
        error: resolvedSearch?.google_error ?? null,
      }}
    />
  );
}
