import { Temporal } from "temporal-polyfill";

/**
 * Aplica o polyfill do Temporal globalmente quando não existir no runtime.
 * Schedule-X v4 depende de `globalThis.Temporal`.
 */
export function ensureTemporalPolyfill() {
  const g = globalThis as unknown as { Temporal?: typeof Temporal };
  if (!g.Temporal) {
    g.Temporal = Temporal;
  }
}

function getTemporalApi(): typeof Temporal {
  const g = globalThis as unknown as { Temporal?: typeof Temporal };
  if (!g.Temporal) {
    g.Temporal = Temporal;
  }
  return g.Temporal;
}

export function isoToZoned(iso: string, timeZone: string): Temporal.ZonedDateTime {
  const runtimeTemporal = getTemporalApi();
  const instant = runtimeTemporal.Instant.from(iso);
  return instant.toZonedDateTimeISO(timeZone);
}

export function zonedToIso(dt: Temporal.ZonedDateTime): string {
  return dt.toInstant().toString();
}

export { Temporal };
