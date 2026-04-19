import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canAccessAgenda,
  fetchClinicProfile,
  isTenantManager,
} from "@/lib/auth/clinic-profile";
import { buildAuthorizationUrl } from "@/lib/google/oauth";
import { loadGoogleProviderSettings } from "@/lib/google/provider-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }
  const profile = await fetchClinicProfile(supabase, user.id);
  if (!profile || !canAccessAgenda(profile) || !isTenantManager(profile)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  if (!profile.tenant_id) {
    return NextResponse.json({ error: "Tenant inválido." }, { status: 400 });
  }

  const provider = await loadGoogleProviderSettings(supabase, profile.tenant_id);
  if (!provider.configured) {
    return NextResponse.json(
      {
        error:
          "Configure client_id, client_secret, redirect_uri e sync_secret na aba Agenda antes de conectar o Google.",
      },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const url = buildAuthorizationUrl(state, provider.settings);
  return NextResponse.redirect(url);
}
