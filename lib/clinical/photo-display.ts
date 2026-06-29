import { formatInTimeZone } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "@/lib/dates";

/** Timestamp usado na UI: captura informada ou registro no sistema. */
export function getPhotoDisplayAt(
  captured_at: string | null,
  created_at: string,
): string {
  return captured_at ?? created_at;
}

/** Formato dd/MM/yyyy HH:mm (24h) no fuso da clínica. */
export function formatPhotoCapturedAt(iso: string): string {
  return formatInTimeZone(new Date(iso), CLINIC_TIMEZONE, "dd/MM/yyyy HH:mm");
}

/** Chave yyyy-MM-dd no fuso da clínica (filtros por data de captura/exibição). */
export function getPhotoDisplayDateKey(
  captured_at: string | null,
  created_at: string,
): string {
  return formatInTimeZone(
    new Date(getPhotoDisplayAt(captured_at, created_at)),
    CLINIC_TIMEZONE,
    "yyyy-MM-dd",
  );
}
