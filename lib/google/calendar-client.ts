import { google, type calendar_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export type CalendarClient = calendar_v3.Calendar;

export function getCalendarClient(auth: OAuth2Client): CalendarClient {
  return google.calendar({ version: "v3", auth });
}

/**
 * Evento do Google normalizado para uso no sistema (timezone em clock time ISO).
 */
export type GoogleEventLite = {
  id: string;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  status?: string | null;
  startIso?: string | null;
  endIso?: string | null;
  allDay: boolean;
  etag?: string | null;
  htmlLink?: string | null;
  updatedIso?: string | null;
};

export function normalizeGoogleEvent(
  e: calendar_v3.Schema$Event,
): GoogleEventLite {
  const allDay = Boolean(e.start?.date && !e.start?.dateTime);
  return {
    id: e.id ?? "",
    summary: e.summary ?? null,
    description: e.description ?? null,
    location: e.location ?? null,
    status: e.status ?? null,
    startIso: e.start?.dateTime ?? e.start?.date ?? null,
    endIso: e.end?.dateTime ?? e.end?.date ?? null,
    allDay,
    etag: e.etag ?? null,
    htmlLink: e.htmlLink ?? null,
    updatedIso: e.updated ?? null,
  };
}

/** Lista eventos em janela absoluta (usada na primeira carga / reset token). */
export async function listEventsWindow(
  client: CalendarClient,
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string,
): Promise<{ events: GoogleEventLite[]; syncToken?: string }> {
  const events: GoogleEventLite[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const res = await client.events.list({
      calendarId,
      singleEvents: true,
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      maxResults: 2500,
      pageToken,
    });
    for (const item of res.data.items ?? []) {
      events.push(normalizeGoogleEvent(item));
    }
    pageToken = res.data.nextPageToken ?? undefined;
    nextSyncToken = res.data.nextSyncToken ?? nextSyncToken;
  } while (pageToken);
  return { events, syncToken: nextSyncToken };
}

/** Pull incremental usando syncToken. Retorna 410 quando precisa re-full-sync. */
export async function listEventsIncremental(
  client: CalendarClient,
  calendarId: string,
  syncToken: string,
): Promise<
  | { kind: "ok"; events: GoogleEventLite[]; syncToken?: string }
  | { kind: "needs_full_sync" }
> {
  const events: GoogleEventLite[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined = syncToken;
  try {
    do {
      const res = await client.events.list({
        calendarId,
        singleEvents: true,
        syncToken: pageToken ? undefined : syncToken,
        pageToken,
        maxResults: 2500,
      });
      for (const item of res.data.items ?? []) {
        events.push(normalizeGoogleEvent(item));
      }
      pageToken = res.data.nextPageToken ?? undefined;
      nextSyncToken = res.data.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
    return { kind: "ok", events, syncToken: nextSyncToken };
  } catch (err) {
    const anyErr = err as { code?: number; status?: number };
    if (anyErr?.code === 410 || anyErr?.status === 410) {
      return { kind: "needs_full_sync" };
    }
    throw err;
  }
}

type EventInput = {
  summary: string;
  description?: string | null;
  location?: string | null;
  startIso: string;
  endIso: string;
  timezone?: string;
};

export async function insertEvent(
  client: CalendarClient,
  calendarId: string,
  input: EventInput,
): Promise<GoogleEventLite> {
  const res = await client.events.insert({
    calendarId,
    requestBody: {
      summary: input.summary,
      description: input.description ?? undefined,
      location: input.location ?? undefined,
      start: { dateTime: input.startIso, timeZone: input.timezone },
      end: { dateTime: input.endIso, timeZone: input.timezone },
    },
  });
  if (!res.data) throw new Error("Google não retornou evento criado.");
  return normalizeGoogleEvent(res.data);
}

export async function updateEvent(
  client: CalendarClient,
  calendarId: string,
  eventId: string,
  input: EventInput,
): Promise<GoogleEventLite> {
  const res = await client.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: input.summary,
      description: input.description ?? undefined,
      location: input.location ?? undefined,
      start: { dateTime: input.startIso, timeZone: input.timezone },
      end: { dateTime: input.endIso, timeZone: input.timezone },
    },
  });
  if (!res.data) throw new Error("Google não retornou evento atualizado.");
  return normalizeGoogleEvent(res.data);
}

export async function deleteEvent(
  client: CalendarClient,
  calendarId: string,
  eventId: string,
): Promise<void> {
  try {
    await client.events.delete({ calendarId, eventId });
  } catch (err) {
    const anyErr = err as { code?: number };
    // 404/410 significa que o evento já sumiu no Google — idempotente.
    if (anyErr?.code === 404 || anyErr?.code === 410) return;
    throw err;
  }
}
