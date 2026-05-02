import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requireLocalAgendaContext } from "@/lib/auth/local-route-context";
import { buildAuthorizationUrl } from "@/lib/google/oauth";
import { loadGoogleProviderSettings } from "@/lib/google/provider-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireLocalAgendaContext({ requireTenantManager: true });
  if (!auth.ok && auth.status === 401) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const provider = await loadGoogleProviderSettings(auth.supabase, auth.tenantId);
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
