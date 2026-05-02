import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireLocalAgendaContext } from "@/lib/auth/local-route-context";
import { exchangeCodeForTokens } from "@/lib/google/oauth";
import { encryptToken } from "@/lib/google/crypto";
import { loadGoogleProviderSettings } from "@/lib/google/provider-settings";

export const dynamic = "force-dynamic";

function redirectWith(
  request: NextRequest,
  path: string,
  params: Record<string, string>,
) {
  const url = new URL(path, request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return redirectWith(request, "/configuracoes/agenda", {
      google_error: errorParam,
    });
  }
  if (!code || !state) {
    return redirectWith(request, "/configuracoes/agenda", {
      google_error: "missing_code",
    });
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gcal_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return redirectWith(request, "/configuracoes/agenda", {
      google_error: "bad_state",
    });
  }
  cookieStore.delete("gcal_oauth_state");

  const auth = await requireLocalAgendaContext({ requireTenantManager: true });
  if (!auth.ok && auth.status === 401) {
    return redirectWith(request, "/login", {});
  }
  if (!auth.ok) {
    return redirectWith(request, "/configuracoes/agenda", {
      google_error: "forbidden",
    });
  }
  const provider = await loadGoogleProviderSettings(auth.supabase, auth.tenantId);
  if (!provider.configured) {
    return redirectWith(request, "/configuracoes/agenda", {
      google_error: "configuracao_incompleta",
    });
  }

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code, provider.settings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("google exchange:", msg);
    return redirectWith(request, "/configuracoes/agenda", {
      google_error: "exchange_failed",
    });
  }

  if (!tokens.refresh_token) {
    // Sem refresh_token: o usuário pode ter concedido antes sem revogar.
    // Pede revogação + reconexão.
    return redirectWith(request, "/configuracoes/agenda", {
      google_error: "no_refresh_token",
    });
  }

  const cipher = encryptToken(tokens.refresh_token, provider.settings.syncSecret);

  // Busca e-mail do user Google
  let googleEmail: string | null = null;
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64url").toString(
          "utf8",
        ),
      );
      if (typeof payload.email === "string") googleEmail = payload.email;
    } catch {
      /* id_token opcional */
    }
  }

  const { error: upsertErr } = await auth.supabase
    .schema("clinic")
    .from("google_calendar_connections")
    .upsert(
      {
        profile_id: auth.user.userId,
        tenant_id: auth.tenantId,
        google_account_email: googleEmail,
        calendar_id: "primary",
        refresh_token_ciphertext: cipher,
        access_token_ciphertext: tokens.access_token
          ? encryptToken(tokens.access_token, provider.settings.syncSecret)
          : null,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
      },
      { onConflict: "profile_id" },
    );

  if (upsertErr) {
    console.error("google connection upsert:", upsertErr.message);
    return redirectWith(request, "/configuracoes/agenda", {
      google_error: "db_upsert_failed",
    });
  }

  // Garante registro em calendar_settings (default off → pull ao usuário ativar)
  await auth.supabase
    .schema("clinic")
    .from("calendar_settings")
    .upsert(
      {
        tenant_id: auth.tenantId,
        google_sync_mode: "pull",
      },
      { onConflict: "tenant_id" },
    );

  return redirectWith(request, "/configuracoes/agenda", {
    google_connected: "1",
  });
}
