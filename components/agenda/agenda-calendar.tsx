"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
  type CalendarEventExternal,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createResizePlugin } from "@schedule-x/resize";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import "@schedule-x/theme-default/dist/index.css";

import { ensureTemporalPolyfill, isoToZoned } from "@/lib/agenda/temporal";
import type { AppointmentDto } from "@/lib/agenda/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { AppointmentDialog } from "./appointment-dialog";
import { AppointmentQuickActions } from "./appointment-quick-actions";

ensureTemporalPolyfill();

type Props = {
  tenantId: string;
  timezone: string;
  initialAppointments: AppointmentDto[];
  initialRange: { fromIso: string; toIso: string };
  clinicClients: { id: string; full_name: string }[];
  procedures: { id: string; name: string; duration_minutes: number | null }[];
  googleConnected: boolean;
  googleSyncMode: "off" | "pull" | "webhook";
  defaultSlotMinutes: number;
  canEdit: boolean;
};

function appointmentToEvent(
  a: AppointmentDto,
  timezone: string,
): CalendarEventExternal {
  const displayTitle =
    a.title ??
    [a.clientName ?? "Paciente", a.procedureName].filter(Boolean).join(" • ");
  return {
    id: a.id,
    title: displayTitle,
    description: a.notes ?? undefined,
    location: a.location ?? undefined,
    start: isoToZoned(a.startsAt, timezone),
    end: isoToZoned(a.endsAt, timezone),
    calendarId:
      a.status === "confirmed"
        ? "confirmed"
        : a.status === "rescheduled"
          ? "rescheduled"
          : a.status === "canceled"
            ? "canceled"
            : a.status === "no_show"
              ? "no_show"
              : a.source === "google"
                ? "google"
                : "clinic",
    _appointment: a,
  };
}

export function AgendaCalendar({
  tenantId,
  timezone,
  initialAppointments,
  initialRange,
  clinicClients,
  procedures,
  googleConnected,
  googleSyncMode,
  defaultSlotMinutes,
  canEdit,
}: Props) {
  const [appointments, setAppointments] = useState<AppointmentDto[]>(
    initialAppointments,
  );
  const [syncing, setSyncing] = useState(false);
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; startsAt: string; endsAt: string }
    | { mode: "edit"; appointment: AppointmentDto }
    | null
  >(null);
  const [quickAppointment, setQuickAppointment] = useState<AppointmentDto | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const eventsService = useMemo(() => createEventsServicePlugin(), []);
  const eventModal = useMemo(() => createEventModalPlugin(), []);
  const dragAndDrop = useMemo(
    () => createDragAndDropPlugin(defaultSlotMinutes),
    [defaultSlotMinutes],
  );
  const resize = useMemo(
    () => createResizePlugin(defaultSlotMinutes),
    [defaultSlotMinutes],
  );
  const currentTime = useMemo(() => createCurrentTimePlugin(), []);

  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;

  const initialEvents = useMemo(
    () => initialAppointments.map((a) => appointmentToEvent(a, timezone)),
    [initialAppointments, timezone],
  );

  const app = useNextCalendarApp({
    views: [
      createViewDay(),
      createViewWeek(),
      createViewMonthGrid(),
      createViewMonthAgenda(),
    ],
    defaultView: "week",
    events: initialEvents,
    locale: "pt-BR",
    firstDayOfWeek: 1,
    timezone,
    weekOptions: {
      gridHeight: 720,
      eventOverlap: false,
      gridStep: 30,
    },
    calendars: {
      clinic: {
        colorName: "clinic",
        label: "Clínica",
        lightColors: {
          main: "#4a655a",
          container: "#cbe9db",
          onContainer: "#1b2a23",
        },
      },
      confirmed: {
        colorName: "confirmed",
        label: "Confirmado",
        lightColors: {
          main: "#15803d",
          container: "#dcfce7",
          onContainer: "#14532d",
        },
      },
      rescheduled: {
        colorName: "rescheduled",
        label: "Reagendado",
        lightColors: {
          main: "#a16207",
          container: "#fef3c7",
          onContainer: "#713f12",
        },
      },
      google: {
        colorName: "google",
        label: "Google",
        lightColors: {
          main: "#3b82f6",
          container: "#dbeafe",
          onContainer: "#0b2553",
        },
      },
      canceled: {
        colorName: "canceled",
        label: "Cancelado",
        lightColors: {
          main: "#b91c1c",
          container: "#fee2e2",
          onContainer: "#7f1d1d",
        },
      },
      no_show: {
        colorName: "no_show",
        label: "Não compareceu",
        lightColors: {
          main: "#c2410c",
          container: "#ffedd5",
          onContainer: "#7c2d12",
        },
      },
    },
    callbacks: canEdit
      ? {
          onEventClick: (ev) => {
            const full = appointmentsRef.current.find((a) => a.id === ev.id);
            if (full) setQuickAppointment(full);
          },
          onClickDateTime: (dt) => {
            const startIso = dt.toInstant().toString();
            const endIso = dt
              .add({ minutes: defaultSlotMinutes })
              .toInstant()
              .toString();
            setDialogState({
              mode: "create",
              startsAt: startIso,
              endsAt: endIso,
            });
          },
          onDoubleClickDateTime: (dt) => {
            const startIso = dt.toInstant().toString();
            const endIso = dt
              .add({ minutes: defaultSlotMinutes })
              .toInstant()
              .toString();
            setDialogState({
              mode: "create",
              startsAt: startIso,
              endsAt: endIso,
            });
          },
          onEventUpdate: async (ev) => {
            const startIso = (ev.start as { toInstant: () => { toString: () => string } })
              .toInstant()
              .toString();
            const endIso = (ev.end as { toInstant: () => { toString: () => string } })
              .toInstant()
              .toString();
            const res = await fetch(`/api/agenda/appointments/${ev.id}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ startsAt: startIso, endsAt: endIso }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              setFeedback(body?.error ?? "Não foi possível mover o evento.");
              // Rollback: re-injeta o evento original usando seus dados atuais
              const original = appointmentsRef.current.find(
                (a) => a.id === ev.id,
              );
              if (original) {
                eventsService.update(appointmentToEvent(original, timezone));
              }
              return;
            }
            const next = body?.data as AppointmentDto | undefined;
            if (next) {
              setAppointments((prev) =>
                prev.map((a) => (a.id === next.id ? next : a)),
              );
            }
          },
          onBeforeEventUpdate: (_old, _next) => true,
        }
      : {},
    plugins: [eventsService, eventModal, dragAndDrop, resize, currentTime],
  });

  // Sincroniza a lista com o plugin quando ela muda
  useEffect(() => {
    eventsService.set(
      appointments.map((a) => appointmentToEvent(a, timezone)),
    );
  }, [appointments, timezone, eventsService]);

  // Realtime Supabase
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`appointments:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "clinic",
          table: "appointments",
          filter: `tenant_id=eq.${tenantId}`,
        },
        async () => {
          try {
            const qs = new URLSearchParams({
              from: initialRange.fromIso,
              to: initialRange.toIso,
            });
            const res = await fetch(`/api/agenda/appointments?${qs}`);
            const body = await res.json();
            if (res.ok && Array.isArray(body.data)) {
              setAppointments(body.data);
            }
          } catch {
            /* silencia erros pontuais de refresh */
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, initialRange.fromIso, initialRange.toIso]);

  async function triggerGoogleSync() {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/agenda/google/sync", { method: "POST" });
      const body = await res.json();
      if (res.ok && body.ok) {
        setFeedback(
          `Sincronização concluída. ${body.upserted ?? 0} atualizados, ${body.deleted ?? 0} removidos.`,
        );
      } else {
        setFeedback(body.error ?? "Falha ao sincronizar.");
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Falha ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  }

  async function onCreate(
    input: CreateAppointmentPayload,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/agenda/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body?.error ?? "Falha ao criar." };
    }
    const created = body.data as AppointmentDto;
    setAppointments((prev) => [...prev, created]);
    return { ok: true };
  }

  async function onUpdate(
    id: string,
    input: Partial<CreateAppointmentPayload>,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/agenda/appointments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body?.error ?? "Falha ao atualizar." };
    }
    const next = body.data as AppointmentDto;
    setAppointments((prev) =>
      prev.map((a) => (a.id === next.id ? next : a)),
    );
    return { ok: true };
  }

  async function onDelete(
    id: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/agenda/appointments/${id}`, {
      method: "DELETE",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body?.error ?? "Falha ao remover." };
    }
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    return { ok: true };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button
              type="button"
              onClick={() => {
                const now = new Date();
                const rounded = new Date(
                  Math.ceil(now.getTime() / (15 * 60_000)) * 15 * 60_000,
                );
                const start = rounded.toISOString();
                const end = new Date(
                  rounded.getTime() + defaultSlotMinutes * 60_000,
                ).toISOString();
                setDialogState({ mode: "create", startsAt: start, endsAt: end });
              }}
              size="sm"
            >
              Novo agendamento
            </Button>
          )}
          {googleConnected && googleSyncMode !== "off" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={triggerGoogleSync}
              disabled={syncing}
            >
              <RefreshCw
                className={cn("h-4 w-4", syncing && "animate-spin")}
                aria-hidden
              />
              {syncing ? "Sincronizando…" : "Sincronizar Google"}
            </Button>
          )}
        </div>
        {feedback && (
          <p className="text-xs text-ink-muted" role="status">
            {feedback}
          </p>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-line/60 bg-surface p-2 shadow-lift">
        <div className="agenda-calendar-shell overflow-x-auto">
          {app && <ScheduleXCalendar calendarApp={app} />}
        </div>
      </div>

      {quickAppointment && (
        <AppointmentQuickActions
          appointment={quickAppointment}
          onClose={() => setQuickAppointment(null)}
          onOpenFullEdit={() => {
            setDialogState({ mode: "edit", appointment: quickAppointment });
            setQuickAppointment(null);
          }}
          onApplyStatus={(id, input) => onUpdate(id, input)}
        />
      )}

      {dialogState && (
        <AppointmentDialog
          state={dialogState}
          onClose={() => setDialogState(null)}
          clients={clinicClients}
          procedures={procedures}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

export type CreateAppointmentPayload = {
  clientId?: string;
  title?: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
  procedureId?: string;
  location?: string;
  color?: string;
  status?:
    | "scheduled"
    | "confirmed"
    | "rescheduled"
    | "completed"
    | "canceled"
    | "no_show";
};
