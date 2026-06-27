"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { clinicNowDateTimeLocalValue } from "@/lib/dates";
import { cn } from "@/lib/utils";

const LOCAL_PATTERN = "yyyy-MM-dd'T'HH:mm";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function parseLocalValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return parse(trimmed, LOCAL_PATTERN, new Date());
  } catch {
    return null;
  }
}

function toLocalValue(date: Date): string {
  return format(date, LOCAL_PATTERN);
}

function clampMinute(minute: number): number {
  return Math.min(59, Math.max(0, minute));
}

function clampHour(hour: number): number {
  return Math.min(23, Math.max(0, hour));
}

export function ClinicDateTimePicker({
  id,
  value,
  onChange,
  disabled,
}: Props) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = parseLocalValue(value) ?? new Date();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

  useEffect(() => {
    if (!open) return;
    const d = parseLocalValue(value) ?? new Date();
    setViewMonth(startOfMonth(d));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const display =
    parseLocalValue(value) != null
      ? format(selected, "dd/MM/yyyy, HH:mm", { locale: ptBR })
      : "Selecionar data e hora";

  const monthStart = startOfMonth(viewMonth);
  const gridDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 }),
  });

  function patchDate(day: Date) {
    const next = new Date(selected);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onChange(toLocalValue(next));
  }

  function patchTime(part: "hour" | "minute", raw: string) {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const next = new Date(selected);
    if (part === "hour") next.setHours(clampHour(n));
    else next.setMinutes(clampMinute(n));
    onChange(toLocalValue(next));
  }

  function useToday() {
    onChange(clinicNowDateTimeLocalValue());
    setOpen(false);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div ref={rootRef} className="relative inline-block w-full max-w-xs">
      <button
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border border-line bg-[#f3f1ee] px-3 text-left text-sm text-ink transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-brand" aria-hidden />
        <span className="flex-1 truncate">{display}</span>
        <Clock className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Data e hora da captura"
          className="absolute left-0 z-50 mt-2 w-[min(100vw-2rem,20rem)] rounded-[1.25rem] border border-line/80 bg-surface p-4 shadow-panel"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Mês anterior"
              className="rounded-lg p-1.5 text-ink-muted transition hover:bg-muted/60 hover:text-ink"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold capitalize text-ink">
              {format(viewMonth, "MMMM yyyy", { locale: ptBR })}
            </p>
            <button
              type="button"
              aria-label="Próximo mês"
              className="rounded-lg p-1.5 text-ink-muted transition hover:bg-muted/60 hover:text-ink"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {gridDays.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const isSelected = isSameDay(day, selected);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => patchDate(day)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-medium transition",
                    !inMonth && "text-ink-subtle/40",
                    inMonth && !isSelected && "text-ink hover:bg-brand/10",
                    isSelected &&
                      "bg-brand text-white shadow-sm ring-1 ring-brand/30",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-line/70 pt-4">
            <label className="sr-only" htmlFor={`${fieldId}-hour`}>
              Hora
            </label>
            <select
              id={`${fieldId}-hour`}
              value={selected.getHours()}
              onChange={(e) => patchTime("hour", e.target.value)}
              className="h-9 flex-1 rounded-md border border-line bg-[#f3f1ee] px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}h
                </option>
              ))}
            </select>
            <span className="text-ink-muted">:</span>
            <label className="sr-only" htmlFor={`${fieldId}-minute`}>
              Minuto
            </label>
            <select
              id={`${fieldId}-minute`}
              value={selected.getMinutes()}
              onChange={(e) => patchTime("minute", e.target.value)}
              className="h-9 flex-1 rounded-md border border-line bg-[#f3f1ee] px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
            >
              {minutes.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={useToday}>
              Hoje
            </Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Aplicar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
