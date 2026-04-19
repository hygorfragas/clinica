import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canAccessAgenda,
  fetchClinicProfile,
} from "@/lib/auth/clinic-profile";
import { runIncrementalPull } from "@/lib/google/sync";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }
  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile || !canAccessAgenda(profile) || !profile.tenant_id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  try {
    const result = await runIncrementalPull(supabase, profile.tenant_id);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
