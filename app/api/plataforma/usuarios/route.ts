import { NextResponse } from "next/server";
import {
  fetchClinicProfile,
  isPlatformSuperAdmin,
} from "@/lib/auth/clinic-profile";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  createPlatformUserBodySchema,
  resetPasswordLinkBodySchema,
  updatePlatformUserProfileBodySchema,
} from "@/lib/validations/platform-users";

type TenantRow = { id: string; name: string | null; slug: string | null };

export async function GET() {
  if (!isSupabasePublicEnvConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado (variáveis de ambiente)." },
      { status: 503 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!isPlatformSuperAdmin(profile)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const admin = createServiceRoleClient();

  const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 });
  }

  const ids = (authUsers?.users ?? []).map((u) => u.id);
  const { data: profiles, error: profErr } = await admin
    .schema("clinic")
    .from("profiles")
    .select("id, full_name, role, tenant_id")
    .in("id", ids);
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  const { data: tenants, error: tenantsErr } = await admin
    .schema("clinic")
    .from("tenants")
    .select("id, name, slug")
    .order("created_at", { ascending: false });
  if (tenantsErr) {
    return NextResponse.json({ error: tenantsErr.message }, { status: 400 });
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));

  const users = (authUsers?.users ?? []).map((u) => {
    const p = profileById.get(u.id);
    const tenant =
      p?.tenant_id != null ? (tenantById.get(p.tenant_id) ?? null) : null;
    return {
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      emailConfirmedAt: u.email_confirmed_at ?? null,
      profile: p
        ? {
            fullName: p.full_name ?? "",
            role: p.role,
            tenantId: p.tenant_id,
            tenant,
          }
        : null,
    };
  });

  return NextResponse.json({ users, tenants: (tenants ?? []) as TenantRow[] });
}

export async function POST(request: Request) {
  if (!isSupabasePublicEnvConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado (variáveis de ambiente)." },
      { status: 503 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!isPlatformSuperAdmin(profile)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = createPlatformUserBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const admin = createServiceRoleClient();
  const { data: created, error: authErr } =
    await admin.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName.trim() },
    });

  if (authErr || !created.user) {
    return NextResponse.json(
      { error: authErr?.message ?? "Falha ao criar usuário" },
      { status: 400 },
    );
  }

  const { error: profileErr } = await admin
    .schema("clinic")
    .from("profiles")
    .update({
      full_name: body.fullName.trim(),
      role: body.role,
      tenant_id: body.tenantId ?? null,
    })
    .eq("id", created.user.id);

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }

  return NextResponse.json({ userId: created.user.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isSupabasePublicEnvConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado (variáveis de ambiente)." },
      { status: 503 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!isPlatformSuperAdmin(profile)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = updatePlatformUserProfileBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const admin = createServiceRoleClient();
  const update: Record<string, unknown> = {};
  if (body.fullName) update.full_name = body.fullName.trim();
  if (body.role) update.role = body.role;
  if (body.tenantId !== undefined) update.tenant_id = body.tenantId;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }
  const { error } = await admin
    .schema("clinic")
    .from("profiles")
    .update(update)
    .eq("id", body.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  // PUT: gerar link de recuperação de senha para um usuário (superadmin).
  if (!isSupabasePublicEnvConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado (variáveis de ambiente)." },
      { status: 503 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const profile = await fetchClinicProfile(supabase, user.id);
  if (!isPlatformSuperAdmin(profile)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = resetPasswordLinkBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  const { data: userData, error: userErr } =
    await admin.auth.admin.getUserById(parsed.data.userId);

  if (userErr || !userData.user?.email) {
    return NextResponse.json(
      { error: userErr?.message ?? "Usuário sem e-mail" },
      { status: 400 },
    );
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: userData.user.email,
    options: parsed.data.redirectTo
      ? { redirectTo: parsed.data.redirectTo }
      : undefined,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    actionLink: (data as { properties?: { action_link?: string } })?.properties
      ?.action_link ?? null,
  });
}

