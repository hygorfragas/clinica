import { redirect } from "next/navigation";
import { AgendaCalendar } from "@/components/agenda/agenda-calendar";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isTenantManager,
} from "@/lib/auth/clinic-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { APPOINTMENT_SELECT, mapAppointmentRow } from "@/lib/agenda/mapper";
import { CLINIC_TIMEZONE } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile || !canAccessAgenda(profile) || !profile.tenant_id) {
    redirect("/aguardando-acesso");
  }

  const tenantId = profile.tenant_id;

  // Janela padrão: -30d ~ +120d para cobrir vistas de semana/mês.
  const now = new Date();
  const fromIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const toIso = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString();

  const [appointmentsRes, clientsRes, proceduresRes, settingsRes, gconnRes] =
    await Promise.all([
      supabase
        .schema("clinic")
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .eq("tenant_id", tenantId)
        .gte("starts_at", fromIso)
        .lte("starts_at", toIso)
        .order("starts_at", { ascending: true }),
      supabase
        .schema("clinic")
        .from("clients")
        .select("id, full_name, cpf")
        .eq("tenant_id", tenantId)
        .is("hidden_from_ui_at", null)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .schema("clinic")
        .from("procedures")
        .select("id, name, duration_minutes")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true })
        .limit(200),
      supabase
        .schema("clinic")
        .from("calendar_settings")
        .select("timezone, default_slot_minutes, google_sync_mode")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabase
        .schema("clinic")
        .from("google_calendar_connections")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle(),
    ]);

  const rows = (appointmentsRes.data ?? []) as unknown as Parameters<
    typeof mapAppointmentRow
  >[0][];
  const appointments = rows.map(mapAppointmentRow);
  const clients = (clientsRes.data ?? []) as {
    id: string;
    full_name: string;
    cpf: string | null;
  }[];
  const procedures = (proceduresRes.data ?? []) as {
    id: string;
    name: string;
    duration_minutes: number | null;
  }[];
  const settings = settingsRes.data ?? null;
  const timezone =
    (settings?.timezone as string | undefined) ?? CLINIC_TIMEZONE;
  const defaultSlotMinutes =
    (settings?.default_slot_minutes as number | undefined) ?? 30;
  const googleSyncMode =
    ((settings?.google_sync_mode as string | undefined) ?? "off") as
      | "off"
      | "pull"
      | "webhook";
  const googleConnected = Boolean(gconnRes.data?.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Agenda
        </h1>
        <p className="text-sm text-ink-muted">
          Visualização semanal com arraste e redimensionamento. Alterações são
          refletidas em tempo real e, quando conectado, sincronizadas com o
          Google Agenda.
        </p>
      </header>

      <AgendaCalendar
        tenantId={tenantId}
        timezone={timezone}
        initialAppointments={appointments}
        initialRange={{ fromIso, toIso }}
        clinicClients={clients}
        procedures={procedures}
        googleConnected={googleConnected}
        googleSyncMode={googleSyncMode}
        defaultSlotMinutes={defaultSlotMinutes}
        canEdit={isTenantManager(profile) || canAccessAgenda(profile)}
      />
    </div>
  );
}
