import type { AppointmentDto } from "./types";

export type RawAppointmentProcedure = {
  procedure_id: string;
  display_order: number;
  procedures?: { name: string } | null | Array<{ name: string }>;
};

export type RawAppointment = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  title: string | null;
  color: string | null;
  location: string | null;
  source: string | null;
  procedure_id: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  google_sync_status: string | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
  clients?: { full_name: string } | null;
  procedures?: { name: string } | null;
  appointment_procedures?: RawAppointmentProcedure[] | null;
};

function procedureNameFromJoin(
  value: RawAppointmentProcedure["procedures"],
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value.name ?? null;
}

export function mapAppointmentRow(row: RawAppointment): AppointmentDto {
  const linked = [...(row.appointment_procedures ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const procedureIds =
    linked.length > 0
      ? linked.map((item) => item.procedure_id)
      : row.procedure_id
        ? [row.procedure_id]
        : [];
  const procedureNames =
    linked.length > 0
      ? linked
          .map((item) => procedureNameFromJoin(item.procedures))
          .filter((name): name is string => !!name)
      : row.procedures?.name
        ? [row.procedures.name]
        : [];

  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    clientName: row.clients?.full_name ?? null,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    notes: row.notes,
    procedureId: procedureIds[0] ?? row.procedure_id ?? null,
    procedureName: procedureNames.join(", ") || null,
    procedureIds,
    procedureNames,
    location: row.location,
    color: row.color,
    source: row.source ?? "system",
    googleEventId: row.google_event_id,
    googleCalendarId: row.google_calendar_id,
    googleSyncStatus: row.google_sync_status ?? "pending",
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const APPOINTMENT_SELECT =
  "id, tenant_id, client_id, starts_at, ends_at, status, notes, title, color, location, source, procedure_id, google_event_id, google_calendar_id, google_sync_status, created_by_profile_id, created_at, updated_at, clients:clients(full_name), procedures:procedures(name), appointment_procedures(procedure_id, display_order, procedures:procedures(name))";
