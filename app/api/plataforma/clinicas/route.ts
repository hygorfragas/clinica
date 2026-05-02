import { NextResponse } from "next/server";
import { requireLocalPlatformAdminContext } from "@/lib/auth/local-route-context";
import { createClinicBodySchema } from "@/lib/validations/tenant";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { slugifyName } from "@/lib/strings";

export async function POST(request: Request) {
  try {
    if (!isSupabasePublicEnvConfigured()) {
      return NextResponse.json(
        { error: "Supabase não configurado (variáveis de ambiente)." },
        { status: 503 },
      );
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = createClinicBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const auth = await requireLocalPlatformAdminContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let svc;
    try {
      svc = createServiceRoleClient();
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Service role indisponível no servidor.";
      return NextResponse.json(
        {
          error:
            msg.includes("SUPABASE_SERVICE_ROLE_KEY")
              ? "Defina SUPABASE_SERVICE_ROLE_KEY no servidor (.env.local) para criar clínicas e usuários."
              : msg,
        },
        { status: 503 },
      );
    }

    const slug =
      body.slug && body.slug.length > 0
        ? body.slug
        : slugifyName(body.name) || `clinica-${Date.now()}`;

    const insertRow = {
      name: body.name.trim(),
      slug,
    };

    const { data: tenant, error: tenantError } = await svc
      .schema("clinic")
      .from("tenants")
      .insert(insertRow)
      .select("id, name, slug")
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: tenantError?.message ?? "Falha ao criar clínica" },
        { status: 400 },
      );
    }

    const adminEmail = body.adminEmail?.trim();
    const adminPassword = body.adminPassword;
    const adminFullName = body.adminFullName?.trim();

    if (!adminEmail || !adminPassword || !adminFullName) {
      return NextResponse.json({ tenant }, { status: 201 });
    }

    try {
      const { data: created, error: authErr } =
        await svc.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: { full_name: adminFullName },
        });

      if (authErr || !created.user) {
        throw new Error(authErr?.message ?? "Falha ao criar usuário");
      }

      const { error: profileErr } = await svc
        .schema("clinic")
        .from("profiles")
        .update({
          tenant_id: tenant.id,
          role: "clinic_admin",
          full_name: adminFullName,
        })
        .eq("id", created.user.id);

      if (profileErr) {
        throw new Error(profileErr.message);
      }

      return NextResponse.json(
        { tenant, adminUserId: created.user.id },
        { status: 201 },
      );
    } catch (e) {
      await svc.schema("clinic").from("tenants").delete().eq("id", tenant.id);
      const message = e instanceof Error ? e.message : "Erro ao convidar admin";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro inesperado ao criar clínica.";
    console.error("[POST /api/plataforma/clinicas]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Lista clínicas (apenas super admin de plataforma). */
export async function GET() {
  try {
    if (!isSupabasePublicEnvConfigured()) {
      return NextResponse.json(
        { error: "Supabase não configurado (variáveis de ambiente)." },
        { status: 503 },
      );
    }

    const auth = await requireLocalPlatformAdminContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let svc;
    try {
      svc = createServiceRoleClient();
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Service role indisponível no servidor.";
      return NextResponse.json(
        {
          error:
            msg.includes("SUPABASE_SERVICE_ROLE_KEY")
              ? "Defina SUPABASE_SERVICE_ROLE_KEY no servidor (.env.local) para listar clínicas."
              : msg,
        },
        { status: 503 },
      );
    }

    const { data, error } = await svc
      .schema("clinic")
      .from("tenants")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ tenants: data ?? [] });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro inesperado ao listar clínicas.";
    console.error("[GET /api/plataforma/clinicas]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
