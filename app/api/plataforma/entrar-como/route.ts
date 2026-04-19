import { NextResponse } from "next/server";
import {
  fetchClinicProfile,
  isPlatformSuperAdmin,
} from "@/lib/auth/clinic-profile";
import { postLoginPathForClinicProfile } from "@/lib/auth/post-login-path";
import { getRequestSiteOrigin } from "@/lib/app/site-origin";
import { impersonateUserBodySchema } from "@/lib/validations/platform-users";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    if (!isSupabasePublicEnvConfigured()) {
      return NextResponse.json(
        { error: "Supabase não configurado (variáveis de ambiente)." },
        { status: 503 },
      );
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = impersonateUserBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user: actor },
    } = await supabase.auth.getUser();
    if (!actor) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const actorProfile = await fetchClinicProfile(supabase, actor.id);
    if (!isPlatformSuperAdmin(actorProfile)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    if (parsed.data.userId === actor.id) {
      return NextResponse.json(
        { error: "Você já está logado com esta conta." },
        { status: 400 },
      );
    }

    let svc;
    try {
      svc = createServiceRoleClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Service role indisponível.";
      return NextResponse.json(
        {
          error: msg.includes("SUPABASE_SERVICE_ROLE_KEY")
            ? "Defina SUPABASE_SERVICE_ROLE_KEY no servidor para usar entrar como."
            : msg,
        },
        { status: 503 },
      );
    }

    const { data: targetUser, error: targetErr } =
      await svc.auth.admin.getUserById(parsed.data.userId);
    if (targetErr || !targetUser.user?.email) {
      return NextResponse.json(
        { error: targetErr?.message ?? "Usuário não encontrado ou sem e-mail." },
        { status: 400 },
      );
    }

    const { data: targetProfile } = await svc
      .schema("clinic")
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", parsed.data.userId)
      .maybeSingle();

    const landing = postLoginPathForClinicProfile(targetProfile);
    const origin = getRequestSiteOrigin(request);
    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set("next", landing);

    const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.user.email,
      options: { redirectTo: callbackUrl.toString() },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkErr?.message ?? "Falha ao gerar link de acesso." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      actionLink: linkData.properties.action_link,
      landing,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro inesperado ao entrar como usuário.";
    console.error("[POST /api/plataforma/entrar-como]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
