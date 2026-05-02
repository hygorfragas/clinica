import { revalidatePath } from "next/cache";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { CLINIC_TIMEZONE } from "@/lib/dates";
import { pushSystemChange } from "@/lib/google/sync";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { APPOINTMENT_SELECT, mapAppointmentRow } from "./mapper";
type ClinicDbClient = ReturnType<typeof createServiceRoleClient>;

function invalidateAgendaCaches() {
  revalidatePath("/agenda");
  revalidatePath("/inicio");
}
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from "./schemas";
import type { AppointmentDto } from "./types";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; conflict?: ConflictInfo };

export type ConflictInfo = {
  id: string;
  clientName: string | null;
  startsAt: string;
  endsAt: string;
  title: string | null;
};

async function getAuthContext() {
  const ssr = await createServerSupabaseClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user?.id) {
    return { ok: false as const, error: "Sessão expirada." };
  }
  const profile = await fetchClinicProfile(ssr, user.id);
  if (!profile || !canAccessAgenda(profile) || !profile.tenant_id) {
    return { ok: false as const, error: "Sem permissão para a agenda." };
  }
  const supabase = createServiceRoleClient();
  return {
    ok: true as const,
    supabase,
    tenantId: profile.tenant_id,
    profileId: user.id,
  };
}

async function findConflict(
  supabase: ClinicDbClient,
  tenantId: string,
  startsAt: string,
  endsAt: string,
  ignoreId?: string | null,
): Promise<ConflictInfo | null> {
  const { data, error } = await supabase.schema("clinic").rpc(
    "appointment_conflict",
    {
      p_tenant_id: tenantId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_ignore_id: ignoreId ?? null,
    },
  );
  if (error) {
    console.error("appointment_conflict RPC:", error.message);
    return null;
  }
  const rows = Array.isArray(data) ? data : [];
  const first = rows[0] as
    | {
        id: string;
        client_name: string | null;
        starts_at: string;
        ends_at: string;
        title: string | null;
      }
    | undefined;
  if (!first) return null;
  return {
    id: first.id,
    clientName: first.client_name,
    startsAt: first.starts_at,
    endsAt: first.ends_at,
    title: first.title,
  };
}

async function fetchTimezone(
  supabase: ClinicDbClient,
  tenantId: string,
): Promise<string> {
  const { data } = await supabase
    .schema("clinic")
    .from("calendar_settings")
    .select("timezone")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data?.timezone as string | undefined) ?? CLINIC_TIMEZONE;
}

async function fetchClientTitleSummary(
  supabase: ClinicDbClient,
  tenantId: string,
  clientId: string | null | undefined,
  procedureId: string | null | undefined,
  fallbackTitle: string | null,
): Promise<string> {
  if (fallbackTitle && fallbackTitle.trim().length > 0) {
    return fallbackTitle;
  }
  const parts: string[] = [];
  if (clientId) {
    const { data: c } = await supabase
      .schema("clinic")
      .from("clients")
      .select("full_name")
      .eq("id", clientId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (c?.full_name) parts.push(c.full_name);
  }
  if (procedureId) {
    const { data: p } = await supabase
      .schema("clinic")
      .from("procedures")
      .select("name")
      .eq("id", procedureId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (p?.name) parts.push(p.name);
  }
  return parts.length > 0 ? parts.join(" • ") : "Agendamento";
}

export async function listAppointments(params: {
  from: string;
  to: string;
}): Promise<ActionResult<AppointmentDto[]>> {
  const auth = await getAuthContext();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .schema("clinic")
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("tenant_id", auth.tenantId)
    .gte("starts_at", params.from)
    .lte("starts_at", params.to)
    .order("starts_at", { ascending: true });

  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as unknown as Parameters<typeof mapAppointmentRow>[0][];
  return { ok: true, data: rows.map(mapAppointmentRow) };
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<ActionResult<AppointmentDto>> {
  const auth = await getAuthContext();
  if (!auth.ok) return auth;

  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" / "),
    };
  }

  if (!parsed.data.clientId) {
    return {
      ok: false,
      error: "Escolha uma paciente para o agendamento.",
    };
  }

  const conflict = await findConflict(
    auth.supabase,
    auth.tenantId,
    parsed.data.startsAt,
    parsed.data.endsAt,
  );
  if (conflict) {
    return {
      ok: false,
      error: `Já existe agendamento com ${conflict.clientName ?? "outra paciente"} nesse horário.`,
      conflict,
    };
  }

  const { data: inserted, error } = await auth.supabase
    .schema("clinic")
    .from("appointments")
    .insert({
      tenant_id: auth.tenantId,
      client_id: parsed.data.clientId,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      title: parsed.data.title ?? null,
      color: parsed.data.color ?? null,
      location: parsed.data.location ?? null,
      procedure_id: parsed.data.procedureId ?? null,
      source: "system",
      google_sync_status: "pending",
      created_by_profile_id: auth.profileId,
    })
    .select(APPOINTMENT_SELECT)
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Falha ao criar agendamento." };
  }

  const appointment = mapAppointmentRow(
    inserted as unknown as Parameters<typeof mapAppointmentRow>[0],
  );

  const tz = await fetchTimezone(auth.supabase, auth.tenantId);
  const summary = await fetchClientTitleSummary(
    auth.supabase,
    auth.tenantId,
    appointment.clientId,
    appointment.procedureId,
    appointment.title,
  );

  const push = await pushSystemChange(auth.supabase, auth.tenantId, {
    appointmentId: appointment.id,
    operation: "insert",
    eventInput: {
      summary,
      description: appointment.notes ?? null,
      location: appointment.location ?? null,
      startIso: appointment.startsAt,
      endIso: appointment.endsAt,
      timezone: tz,
    },
  });

  if (push.ok) {
    await auth.supabase
      .schema("clinic")
      .from("appointments")
      .update({
        google_event_id: push.googleEventId ?? null,
        google_sync_status: "synced",
        google_synced_at: new Date().toISOString(),
      })
      .eq("id", appointment.id);
    appointment.googleEventId = push.googleEventId ?? null;
    appointment.googleSyncStatus = "synced";
  } else {
    await auth.supabase
      .schema("clinic")
      .from("appointments")
      .update({ google_sync_status: "queued" })
      .eq("id", appointment.id);
    appointment.googleSyncStatus = "queued";
  }

  invalidateAgendaCaches();
  return { ok: true, data: appointment };
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput,
): Promise<ActionResult<AppointmentDto>> {
  const auth = await getAuthContext();
  if (!auth.ok) return auth;

  const parsed = updateAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" / "),
    };
  }

  const { data: current, error: readErr } = await auth.supabase
    .schema("clinic")
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();
  if (readErr || !current) {
    return { ok: false, error: readErr?.message ?? "Agendamento não encontrado." };
  }
  const existing = mapAppointmentRow(
    current as unknown as Parameters<typeof mapAppointmentRow>[0],
  );

  const startsAt = parsed.data.startsAt ?? existing.startsAt;
  const endsAt = parsed.data.endsAt ?? existing.endsAt;

  if (new Date(endsAt) <= new Date(startsAt)) {
    return { ok: false, error: "Horário final precisa ser depois do inicial." };
  }

  if (parsed.data.startsAt || parsed.data.endsAt) {
    const conflict = await findConflict(
      auth.supabase,
      auth.tenantId,
      startsAt,
      endsAt,
      id,
    );
    if (conflict) {
      return {
        ok: false,
        error: `Já existe agendamento com ${conflict.clientName ?? "outra paciente"} nesse horário.`,
        conflict,
      };
    }
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.clientId !== undefined) patch.client_id = parsed.data.clientId;
  if (parsed.data.startsAt !== undefined) patch.starts_at = parsed.data.startsAt;
  if (parsed.data.endsAt !== undefined) patch.ends_at = parsed.data.endsAt;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes ?? null;
  if (parsed.data.title !== undefined) patch.title = parsed.data.title ?? null;
  if (parsed.data.color !== undefined) patch.color = parsed.data.color ?? null;
  if (parsed.data.location !== undefined) patch.location = parsed.data.location ?? null;
  if (parsed.data.procedureId !== undefined)
    patch.procedure_id = parsed.data.procedureId ?? null;
  patch.google_sync_status = "pending";

  const { data: updated, error } = await auth.supabase
    .schema("clinic")
    .from("appointments")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .select(APPOINTMENT_SELECT)
    .single();
  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Falha ao atualizar agendamento." };
  }
  const next = mapAppointmentRow(
    updated as unknown as Parameters<typeof mapAppointmentRow>[0],
  );

  const tz = await fetchTimezone(auth.supabase, auth.tenantId);
  const summary = await fetchClientTitleSummary(
    auth.supabase,
    auth.tenantId,
    next.clientId,
    next.procedureId,
    next.title,
  );

  const push = await pushSystemChange(auth.supabase, auth.tenantId, {
    appointmentId: next.id,
    operation: next.googleEventId ? "update" : "insert",
    googleEventId: next.googleEventId ?? undefined,
    eventInput: {
      summary,
      description: next.notes ?? null,
      location: next.location ?? null,
      startIso: next.startsAt,
      endIso: next.endsAt,
      timezone: tz,
    },
  });

  if (push.ok) {
    await auth.supabase
      .schema("clinic")
      .from("appointments")
      .update({
        google_event_id: push.googleEventId ?? next.googleEventId ?? null,
        google_sync_status: "synced",
        google_synced_at: new Date().toISOString(),
      })
      .eq("id", next.id);
    next.googleSyncStatus = "synced";
    if (push.googleEventId) next.googleEventId = push.googleEventId;
  } else {
    await auth.supabase
      .schema("clinic")
      .from("appointments")
      .update({ google_sync_status: "queued" })
      .eq("id", next.id);
    next.googleSyncStatus = "queued";
  }

  invalidateAgendaCaches();
  return { ok: true, data: next };
}

export async function deleteAppointment(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await getAuthContext();
  if (!auth.ok) return auth;

  const { data: current } = await auth.supabase
    .schema("clinic")
    .from("appointments")
    .select("id, google_event_id")
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  if (!current) return { ok: false, error: "Agendamento não encontrado." };

  await pushSystemChange(auth.supabase, auth.tenantId, {
    appointmentId: id,
    operation: "delete",
    googleEventId: (current as { google_event_id: string | null }).google_event_id ?? null,
  });

  const { error } = await auth.supabase
    .schema("clinic")
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);

  if (error) return { ok: false, error: error.message };
  invalidateAgendaCaches();
  return { ok: true, data: { id } };
}
