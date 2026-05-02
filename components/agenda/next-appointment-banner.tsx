"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { useAgendaNotifications } from "./agenda-notifications-provider";

const DISMISS_STORAGE_KEY = "agenda:banner-dismiss:v1";
const DISMISS_WINDOW_MS = 10 * 60_000;

function describeAppointment(a: {
  clientName: string | null;
  procedureName: string | null;
  title: string | null;
}): string {
  const pieces: string[] = [];
  if (a.clientName) pieces.push(a.clientName);
  if (a.procedureName) pieces.push(a.procedureName);
  if (!pieces.length && a.title) pieces.push(a.title);
  if (!pieces.length) pieces.push("Agendamento");
  return pieces.join(" • ");
}

function formatCountdown(startsAt: string): string {
  const diff = new Date(startsAt).getTime() - Date.now();
  if (diff <= 0) return "agora";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) {
    return rest > 0 ? `em ${hours}h ${rest}min` : `em ${hours}h`;
  }
  return new Date(startsAt).toLocaleString("pt-BR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NextAppointmentBanner() {
  const { nextAppointment } = useAgendaNotifications();
  const [now, setNow] = useState(() => Date.now());
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(DISMISS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id: string; at: number };
      if (!parsed?.id || typeof parsed.at !== "number") return;
      if (Date.now() - parsed.at > DISMISS_WINDOW_MS) return;
      setDismissedId(parsed.id);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(handle);
  }, []);

  if (!nextAppointment) return null;

  const diffMs = new Date(nextAppointment.startsAt).getTime() - now;
  const shouldShow = diffMs <= 2 * 60 * 60_000 && diffMs >= -5 * 60_000;
  if (!shouldShow) return null;
  if (dismissedId === nextAppointment.id) return null;

  const urgent = diffMs <= 15 * 60_000;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 text-sm shadow-sm ${
        urgent
          ? "border-b border-brand/20 bg-brand/10 text-ink"
          : "border-b border-line bg-muted/70 text-ink"
      }`}
    >
      <CalendarClock
        className={`h-4 w-4 shrink-0 ${urgent ? "text-brand" : "text-ink-muted"}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate">
          <span className="font-medium">
            Próximo agendamento {formatCountdown(nextAppointment.startsAt)}
          </span>
          <span className="text-ink-muted"> · </span>
          <span className="text-ink-muted">
            {describeAppointment(nextAppointment)} às {formatTime(nextAppointment.startsAt)}
          </span>
        </p>
      </div>
      <Link
        href="/agenda"
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/10"
      >
        Abrir agenda
      </Link>
      <button
        type="button"
        className="rounded-md p-1 text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        aria-label="Fechar aviso"
        onClick={() => {
          setDismissedId(nextAppointment.id);
          try {
            sessionStorage.setItem(
              DISMISS_STORAGE_KEY,
              JSON.stringify({ id: nextAppointment.id, at: Date.now() }),
            );
          } catch {
            /* ignore */
          }
        }}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
