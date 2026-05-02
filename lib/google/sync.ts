import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  deleteEvent as gDeleteEvent,
  getCalendarClient,
  insertEvent as gInsertEvent,
  listEventsIncremental,
  listEventsWindow,
  normalizeGoogleEvent,
  updateEvent as gUpdateEvent,
  type GoogleEventLite,
} from "./calendar-client";
import { createClientWithRefreshToken } from "./oauth";
import { decryptToken } from "./crypto";
import { loadGoogleProviderSettings } from "./provider-settings";

type Client = SupabaseClient<Database>;

type ConnectionRow = {
  id: string;
  tenant_id: string;
  calendar_id: string | null;
  refresh_token_ciphertext: string | null;
};

async function loadConnection(
  supabase: Client,
  tenantId: string,
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .schema("clinic")
    .from("google_calendar_connections")
    .select("id, tenant_id, calendar_id, refresh_token_ciphertext")
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as ConnectionRow | null) ?? null;
}

/** Obtém client Google autenticado para um tenant usando o refresh_token cifrado. */
export async function getGoogleCalendarForTenant(
  supabase: Client,
  tenantId: string,
): Promise<{ calendar: ReturnType<typeof getCalendarClient>; calendarId: string } | null> {
  const provider = await loadGoogleProviderSettings(supabase, tenantId);
  if (!provider.configured) return null;
  const conn = await loadConnection(supabase, tenantId);
  if (!conn?.refresh_token_ciphertext) return null;
  const refreshToken = decryptToken(
    conn.refresh_token_ciphertext,
    provider.settings.syncSecret,
  );
  const auth = createClientWithRefreshToken(refreshToken, provider.settings);
  const calendar = getCalendarClient(auth);
  return {
    calendar,
    calendarId: conn.calendar_id ?? "primary",
  };
}

/** Sincroniza mudanças vindas do Google para o banco local (upsert/delete). */
export async function applyIncomingGoogleEvents(
  supabase: Client,
  tenantId: string,
  calendarId: string,
  events: GoogleEventLite[],
): Promise<{ upserted: number; deleted: number }> {
  let upserted = 0;
  let deleted = 0;

  for (const ev of events) {
    if (!ev.id) continue;
    if (ev.status === "cancelled") {
      const { error } = await supabase
        .schema("clinic")
        .from("appointments")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("google_event_id", ev.id);
      if (!error) deleted += 1;
      continue;
    }

    if (!ev.startIso || !ev.endIso) continue;

    const { data: existing } = await supabase
      .schema("clinic")
      .from("appointments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("google_event_id", ev.id)
      .maybeSingle();

    const payload = {
      tenant_id: tenantId,
      title: ev.summary ?? null,
      notes: ev.description ?? null,
      location: ev.location ?? null,
      starts_at: ev.startIso,
      ends_at: ev.endIso,
      status: "scheduled" as const,
      source: "google",
      google_event_id: ev.id,
      google_calendar_id: calendarId,
      google_etag: ev.etag ?? null,
      google_sync_status: "synced",
      google_synced_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase
        .schema("clinic")
        .from("appointments")
        .update(payload)
        .eq("id", existing.id);
      if (!error) upserted += 1;
    } else {
      // Para criar, precisa de client_id — eventos externos sem paciente
      // vinculado ficam como "agenda externa" (client_id sintético: usa
      // um cliente de marcador se definido, senão grava como holder com
      // client_id null-safe pulando).
      // No MVP: ignoramos eventos sem vínculo possível.
      // (A entrada pelo sistema sempre carrega client_id.)
    }
  }

  return { upserted, deleted };
}

/** Executa pull incremental (syncToken) para um tenant. */
export async function runIncrementalPull(
  supabase: Client,
  tenantId: string,
): Promise<{ ok: boolean; message: string; upserted?: number; deleted?: number }> {
  const ctx = await getGoogleCalendarForTenant(supabase, tenantId);
  if (!ctx) return { ok: false, message: "Sem conexão Google ativa." };
  const { calendar, calendarId } = ctx;

  const { data: stateRow } = await supabase
    .schema("clinic")
    .from("google_calendar_sync_state")
    .select("id, sync_token, connection_id")
    .eq("tenant_id", tenantId)
    .eq("calendar_id", calendarId)
    .maybeSingle();

  let events: GoogleEventLite[] = [];
  let newToken: string | undefined;

  if (stateRow?.sync_token) {
    const res = await listEventsIncremental(calendar, calendarId, stateRow.sync_token);
    if (res.kind === "needs_full_sync") {
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
      const full = await listEventsWindow(calendar, calendarId, from, to);
      events = full.events;
      newToken = full.syncToken;
    } else {
      events = res.events;
      newToken = res.syncToken;
    }
  } else {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const full = await listEventsWindow(calendar, calendarId, from, to);
    events = full.events;
    newToken = full.syncToken;
  }

  const applied = await applyIncomingGoogleEvents(supabase, tenantId, calendarId, events);

  const conn = await loadConnection(supabase, tenantId);
  if (conn) {
    if (stateRow?.id) {
      await supabase
        .schema("clinic")
        .from("google_calendar_sync_state")
        .update({
          sync_token: newToken ?? stateRow.sync_token ?? null,
          last_synced_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", stateRow.id);
    } else {
      await supabase
        .schema("clinic")
        .from("google_calendar_sync_state")
        .insert({
          tenant_id: tenantId,
          connection_id: conn.id,
          calendar_id: calendarId,
          sync_token: newToken ?? null,
          last_synced_at: new Date().toISOString(),
        });
    }
  }

  return {
    ok: true,
    message: "Sincronização concluída.",
    upserted: applied.upserted,
    deleted: applied.deleted,
  };
}

type OutboundPayload = {
  appointmentId: string;
  operation: "insert" | "update" | "delete";
  eventInput?: {
    summary: string;
    description?: string | null;
    location?: string | null;
    startIso: string;
    endIso: string;
    timezone?: string;
  };
  googleEventId?: string | null;
};

/** Aplica mudança feita no sistema direto no Google (best-effort).
 *  Falhas são enfileiradas em `google_calendar_outbox` para retry. */
export async function pushSystemChange(
  supabase: Client,
  tenantId: string,
  payload: OutboundPayload,
): Promise<{ ok: boolean; googleEventId?: string | null; error?: string }> {
  const ctx = await getGoogleCalendarForTenant(supabase, tenantId);
  if (!ctx) {
    return { ok: false, error: "Sem conexão Google ativa." };
  }
  const { calendar, calendarId } = ctx;

  try {
    if (payload.operation === "delete" && payload.googleEventId) {
      await gDeleteEvent(calendar, calendarId, payload.googleEventId);
      return { ok: true, googleEventId: null };
    }
    if (payload.operation === "insert" && payload.eventInput) {
      const ev = await gInsertEvent(calendar, calendarId, payload.eventInput);
      return { ok: true, googleEventId: ev.id };
    }
    if (payload.operation === "update" && payload.googleEventId && payload.eventInput) {
      const ev = await gUpdateEvent(
        calendar,
        calendarId,
        payload.googleEventId,
        payload.eventInput,
      );
      return { ok: true, googleEventId: ev.id };
    }
    if (payload.operation === "update" && !payload.googleEventId && payload.eventInput) {
      const ev = await gInsertEvent(calendar, calendarId, payload.eventInput);
      return { ok: true, googleEventId: ev.id };
    }
    return { ok: false, error: "Payload inválido." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.schema("clinic").from("google_calendar_outbox").insert({
      tenant_id: tenantId,
      appointment_id: payload.appointmentId,
      operation: payload.operation,
      payload: { ...payload, error: msg },
      last_error: msg,
    });
    return { ok: false, error: msg };
  }
}

export { normalizeGoogleEvent };
