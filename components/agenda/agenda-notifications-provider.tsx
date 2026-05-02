"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { AppointmentDto } from "@/lib/agenda/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AgendaNotificationsContextValue = {
  upcoming: AppointmentDto[];
  nextAppointment: AppointmentDto | null;
  refresh: () => Promise<void>;
  loading: boolean;
  lastUpdatedAt: number | null;
};

const AgendaNotificationsContext =
  createContext<AgendaNotificationsContextValue | null>(null);

const LOOKAHEAD_HOURS = 24;
const POLL_INTERVAL_MS = 30_000;
const ALERT_WINDOW_T15_MS = 15 * 60_000;
const ALERT_WINDOW_T0_MS = 60_000;
const DEDUPE_STORAGE_KEY = "agenda:alerts:v1";

type Marker = "t15" | "t0";

function dedupeKey(appointmentId: string, marker: Marker) {
  return `${appointmentId}:${marker}`;
}

function readDedupeSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DEDUPE_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function writeDedupeSet(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* storage pode estar indisponível em modo anônimo */
  }
}

function pruneDedupeForIds(set: Set<string>, validIds: Set<string>): Set<string> {
  const next = new Set<string>();
  for (const key of set) {
    const [id] = key.split(":");
    if (id && validIds.has(id)) {
      next.add(key);
    }
  }
  return next;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function describeAppointment(a: AppointmentDto): string {
  const pieces: string[] = [];
  if (a.clientName) pieces.push(a.clientName);
  if (a.procedureName) pieces.push(a.procedureName);
  if (!pieces.length && a.title) pieces.push(a.title);
  if (!pieces.length) pieces.push("Agendamento");
  return pieces.join(" • ");
}

export function AgendaNotificationsProvider({
  tenantId,
  children,
}: {
  tenantId: string;
  children: ReactNode;
}) {
  const [upcoming, setUpcoming] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const dedupeRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    dedupeRef.current = readDedupeSet();
  }, []);

  const refresh = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 5 * 60_000);
    const to = new Date(now.getTime() + LOOKAHEAD_HOURS * 60 * 60_000);
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetch(`/api/agenda/appointments?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = (await res.json()) as { data?: AppointmentDto[] };
      if (Array.isArray(body.data)) {
        const filtered = body.data.filter((a) => {
          if (a.status === "canceled" || a.status === "no_show") return false;
          return new Date(a.endsAt).getTime() >= Date.now();
        });
        setUpcoming(filtered);
        setLastUpdatedAt(Date.now());
        const validIds = new Set(filtered.map((a) => a.id));
        const pruned = pruneDedupeForIds(dedupeRef.current, validIds);
        if (pruned.size !== dedupeRef.current.size) {
          dedupeRef.current = pruned;
          writeDedupeSet(pruned);
        }
      }
    } catch {
      /* silencioso: evita ruído se a aba perder rede brevemente */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`agenda-notify:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "clinic",
          table: "appointments",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, refresh]);

  useEffect(() => {
    function checkMarkers() {
      const now = Date.now();
      let changed = false;
      for (const appointment of upcoming) {
        if (appointment.status === "canceled" || appointment.status === "no_show") {
          continue;
        }
        const startTs = new Date(appointment.startsAt).getTime();
        if (!Number.isFinite(startTs)) continue;
        const diff = startTs - now;

        if (
          diff > 0 &&
          diff <= ALERT_WINDOW_T15_MS &&
          diff > ALERT_WINDOW_T0_MS
        ) {
          const key = dedupeKey(appointment.id, "t15");
          if (!dedupeRef.current.has(key)) {
            dedupeRef.current.add(key);
            changed = true;
            const minutes = Math.max(1, Math.round(diff / 60_000));
            toast.info(`Agendamento em ${minutes} min`, {
              description: `${describeAppointment(appointment)} às ${formatTime(appointment.startsAt)}`,
              duration: 8_000,
              id: key,
            });
          }
        } else if (diff <= ALERT_WINDOW_T0_MS && diff >= -ALERT_WINDOW_T0_MS) {
          const key = dedupeKey(appointment.id, "t0");
          if (!dedupeRef.current.has(key)) {
            dedupeRef.current.add(key);
            changed = true;
            toast.success("Hora do atendimento", {
              description: `${describeAppointment(appointment)} · ${formatTime(appointment.startsAt)}`,
              duration: 10_000,
              id: key,
            });
          }
        }
      }
      if (changed) {
        writeDedupeSet(dedupeRef.current);
      }
    }

    checkMarkers();
    const handle = window.setInterval(checkMarkers, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(handle);
    };
  }, [upcoming]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const future = upcoming
      .filter((a) => {
        if (a.status === "canceled" || a.status === "no_show") return false;
        return new Date(a.startsAt).getTime() + 60_000 >= now;
      })
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    return future[0] ?? null;
  }, [upcoming]);

  const value = useMemo<AgendaNotificationsContextValue>(
    () => ({
      upcoming,
      nextAppointment,
      refresh,
      loading,
      lastUpdatedAt,
    }),
    [upcoming, nextAppointment, refresh, loading, lastUpdatedAt],
  );

  return (
    <AgendaNotificationsContext.Provider value={value}>
      {children}
    </AgendaNotificationsContext.Provider>
  );
}

export function useAgendaNotifications(): AgendaNotificationsContextValue {
  const ctx = useContext(AgendaNotificationsContext);
  if (!ctx) {
    return {
      upcoming: [],
      nextAppointment: null,
      refresh: async () => {},
      loading: false,
      lastUpdatedAt: null,
    };
  }
  return ctx;
}
