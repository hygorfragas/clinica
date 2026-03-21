import { GoogleCalendarNudge } from "@/components/agenda/google-calendar-nudge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import {
  formatTimeLabel,
  formatWeekdayLong,
  getDayBoundsUtcIso,
} from "@/lib/dates";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type AppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  clients: { full_name: string } | null;
};

export default async function AgendaPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile || !canAccessAgenda(profile)) {
    redirect("/aguardando-acesso");
  }

  const { startIso, endIso } = getDayBoundsUtcIso(new Date());

  const tenantId = profile.tenant_id;
  if (!tenantId) {
    redirect("/aguardando-acesso");
  }

  const { data: raw, error } = await supabase
    .schema("clinic")
    .from("appointments")
    .select("id, starts_at, ends_at, status, notes, clients ( full_name )")
    .eq("tenant_id", tenantId)
    .gte("starts_at", startIso)
    .lte("starts_at", endIso)
    .order("starts_at", { ascending: true });

  const appointments = (raw ?? []) as AppointmentRow[];

  const labelDay = formatWeekdayLong(startIso);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Agenda de hoje
        </h1>
        <p className="mt-1 capitalize text-sm text-ink-muted">{labelDay}</p>
      </div>

      <GoogleCalendarNudge profileId={profile.id} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Horários do dia</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-danger">
              Não foi possível carregar os agendamentos. Tente novamente.
            </p>
          )}
          {!error && appointments.length === 0 && (
            <p className="text-sm text-ink-muted">
              Nenhum agendamento para hoje. Quando houver consultas ou
              procedimentos marcados, eles aparecerão aqui em ordem de horário.
            </p>
          )}
          {!error && appointments.length > 0 && (
            <ul className="divide-y divide-line" aria-label="Agendamentos do dia">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {a.clients?.full_name ?? "Paciente"}
                    </p>
                    {a.notes ? (
                      <p className="text-sm text-ink-muted line-clamp-2">
                        {a.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    <time className="text-sm tabular-nums text-ink">
                      {formatTimeLabel(a.starts_at)} –{" "}
                      {formatTimeLabel(a.ends_at)}
                    </time>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
                      {a.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
