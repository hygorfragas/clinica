import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isTenantManager,
} from "@/lib/auth/clinic-profile";
import { getGoogleCalendarForTenant } from "@/lib/google/sync";
import { loadGoogleProviderSettings } from "@/lib/google/provider-settings";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const provider = await loadGoogleProviderSettings(supabase, profile.tenant_id);
  if (!provider.configured) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        providerConfigured: false,
        missingProviderKeys: provider.missingKeys,
        message: "Integração Google incompleta na aba Agenda.",
      },
      { status: 400 },
    );
  }

  const { data: connection } = await supabase
    .schema("clinic")
    .from("google_calendar_connections")
    .select("id, calendar_id, google_account_email")
    .eq("tenant_id", profile.tenant_id)
    .limit(1)
    .maybeSingle();

  if (!connection?.id) {
    return NextResponse.json({
      ok: true,
      connected: false,
      providerConfigured: true,
      message: "Credenciais OK. Nenhuma conta Google vinculada para este tenant.",
    });
  }

  try {
    const calendarCtx = await getGoogleCalendarForTenant(
      supabase,
      profile.tenant_id,
    );
    if (!calendarCtx) {
      return NextResponse.json(
        {
          ok: false,
          connected: false,
          providerConfigured: true,
          message: "Conexão encontrada, mas não foi possível autenticar no Google.",
        },
        { status: 400 },
      );
    }

    const calendarId = connection.calendar_id ?? "primary";
    const ping = await calendarCtx.calendar.calendars.get({ calendarId });

    return NextResponse.json({
      ok: true,
      connected: true,
      providerConfigured: true,
      accountEmail: connection.google_account_email,
      calendarId,
      calendarSummary: ping.data.summary ?? null,
      message: "Integração Google validada com sucesso.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        connected: true,
        providerConfigured: true,
        message: `Falha ao validar token/sync com Google: ${message}`,
      },
      { status: 500 },
    );
  }
}
