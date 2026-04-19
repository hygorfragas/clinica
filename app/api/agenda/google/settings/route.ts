import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isTenantManager,
} from "@/lib/auth/clinic-profile";
import { calendarSettingsSchema } from "@/lib/agenda/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }
  const profile = await fetchClinicProfile(supabase, user.id);
  if (
    !profile ||
    !canAccessAgenda(profile) ||
    !isTenantManager(profile) ||
    !profile.tenant_id
  ) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = calendarSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" / ") },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .schema("clinic")
    .from("calendar_settings")
    .upsert(
      {
        tenant_id: profile.tenant_id,
        google_sync_mode: parsed.data.googleSyncMode,
        pull_interval_minutes: parsed.data.pullIntervalMinutes,
        default_slot_minutes: parsed.data.defaultSlotMinutes,
        default_calendar_id: parsed.data.defaultCalendarId ?? null,
        timezone: parsed.data.timezone,
        business_hours: parsed.data.businessHours,
        google_oauth_client_id:
          parsed.data.googleCredentials?.clientId?.trim() || null,
        google_oauth_client_secret:
          parsed.data.googleCredentials?.clientSecret?.trim() || null,
        google_oauth_redirect_uri:
          parsed.data.googleCredentials?.redirectUri?.trim() || null,
        google_sync_secret:
          parsed.data.googleCredentials?.syncSecret?.trim() || null,
      },
      { onConflict: "tenant_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao salvar configurações." },
      { status: 400 },
    );
  }

  return NextResponse.json({ data });
}
