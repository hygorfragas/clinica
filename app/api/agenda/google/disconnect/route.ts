import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isTenantManager,
} from "@/lib/auth/clinic-profile";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }
  const profile = await fetchClinicProfile(supabase, user.id);
  if (
    !profile ||
    !canAccessAgenda(profile) ||
    !isTenantManager(profile) ||
    !profile.tenant_id
  ) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  await supabase
    .schema("clinic")
    .from("google_calendar_sync_state")
    .delete()
    .eq("tenant_id", profile.tenant_id);

  const { error } = await supabase
    .schema("clinic")
    .from("google_calendar_connections")
    .delete()
    .eq("profile_id", profile.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .schema("clinic")
    .from("calendar_settings")
    .update({ google_sync_mode: "off" })
    .eq("tenant_id", profile.tenant_id);

  return NextResponse.json({ ok: true });
}
