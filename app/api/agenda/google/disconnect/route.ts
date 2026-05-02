import { NextResponse } from "next/server";
import { requireLocalAgendaContext } from "@/lib/auth/local-route-context";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireLocalAgendaContext({ requireTenantManager: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await auth.supabase
    .schema("clinic")
    .from("google_calendar_sync_state")
    .delete()
    .eq("tenant_id", auth.tenantId);

  const { error } = await auth.supabase
    .schema("clinic")
    .from("google_calendar_connections")
    .delete()
    .eq("profile_id", auth.user.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await auth.supabase
    .schema("clinic")
    .from("calendar_settings")
    .update({ google_sync_mode: "off" })
    .eq("tenant_id", auth.tenantId);

  return NextResponse.json({ ok: true });
}
