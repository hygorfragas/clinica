import { endOfDay, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Fuso padrão da operação (MVP). */
export const CLINIC_TIMEZONE = "America/Sao_Paulo";

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
