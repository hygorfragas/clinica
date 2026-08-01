import { endOfDay, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Fuso padrão da operação (MVP). */
export const CLINIC_TIMEZONE = "America/Sao_Paulo";

/**
 * Hora (0–23) e dia da semana (0=domingo … 6=sábado) no fuso da clínica.
 * Use em Server Components: `Date#getHours()` / `getDay()` refletem o TZ do
 * processo (UTC no container), não o horário operacional da clínica.
 */
export function getClinicLocalParts(
  reference: Date = new Date(),
  timeZone: string = CLINIC_TIMEZONE,
): { hour: number; weekday: number } {
  const zoned = toZonedTime(reference, timeZone);
  return {
    hour: zoned.getHours(),
    weekday: zoned.getDay(),
  };
}

/** Limites do dia civil no fuso da clínica, em ISO UTC para consultas ao Postgres. */
export function getDayBoundsUtcIso(reference: Date = new Date()): {
  startIso: string;
  endIso: string;
} {
  const zoned = toZonedTime(reference, CLINIC_TIMEZONE);
  const startLocal = startOfDay(zoned);
  const endLocal = endOfDay(zoned);
  const startUtc = fromZonedTime(startLocal, CLINIC_TIMEZONE);
  const endUtc = fromZonedTime(endLocal, CLINIC_TIMEZONE);
  return { startIso: startUtc.toISOString(), endIso: endUtc.toISOString() };
}

export function formatTimeLabel(iso: string, locale = "pt-BR"): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLINIC_TIMEZONE,
  });
}

export function formatWeekdayLong(iso: string, locale = "pt-BR"): string {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: CLINIC_TIMEZONE,
  });
}

/** Valor para input `datetime-local` com o horário atual no fuso da clínica. */
export function clinicNowDateTimeLocalValue(): string {
  return formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/** Converte `datetime-local` (fuso da clínica) para ISO UTC. */
export function clinicDateTimeLocalToUtcIso(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(trimmed);
  if (!match) {
    throw new Error("Data/hora inválida.");
  }
  const normalized = `${match[1]} ${match[2]}:00`;
  return fromZonedTime(normalized, CLINIC_TIMEZONE).toISOString();
}

/** Partes civis de um `datetime-local` no fuso da clínica (não no fuso do browser). */
export type ClinicDateTimeLocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function parseClinicDateTimeLocal(
  value: string,
): ClinicDateTimeLocalParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }
  return { year, month, day, hour, minute };
}

export function formatClinicDateTimeLocal(
  parts: ClinicDateTimeLocalParts,
): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Data civil (yyyy-MM-dd) no fuso da clínica a partir de um instante UTC ISO. */
export function clinicCalendarDateFromUtcIso(iso: string): string {
  return formatInTimeZone(iso, CLINIC_TIMEZONE, "yyyy-MM-dd");
}
