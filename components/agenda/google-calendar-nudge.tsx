import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GoogleCalendarNudge({ profileId }: { profileId: string }) {
  const supabase = await createServerSupabaseClient();
  const { data: conn } = await supabase
    .schema("clinic")
    .from("google_calendar_connections")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (conn) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-line bg-brand-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface shadow-sm">
          <CalendarClock className="h-5 w-5 text-brand" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">Google Agenda</p>
          <p className="text-sm text-ink-muted">
            Ainda não há calendário vinculado. Quando a integração estiver
            disponível, você poderá sincronizar os horários aqui.
          </p>
        </div>
      </div>
      <Link
        href="/configuracoes/agenda"
        className="inline-flex shrink-0 items-center justify-center rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-muted hover:text-ink"
      >
        Vincular (em breve)
      </Link>
    </div>
  );
}
