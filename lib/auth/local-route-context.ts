import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";

type LocalUser = {
  userId: string;
  email: string;
  role: string;
  tenantId: string | null;
};

const AGENDA_ROLES = new Set(["owner", "clinic_admin", "agent"]);
const TENANT_MANAGER_ROLES = new Set(["owner", "clinic_admin"]);
const PLATFORM_ADMIN_ROLES = new Set(["owner", "platform_super_admin"]);

export type LocalRouteContextError =
  | { ok: false; status: 401; error: "Sessão expirada." }
  | { ok: false; status: 403; error: "Sem permissão." }
  | { ok: false; status: 400; error: "Tenant inválido." }
  | { ok: false; status: 503; error: string };

function createLocalServiceClient() {
  try {
    return { ok: true as const, client: createServiceRoleClient() };
  } catch (error) {
    return {
      ok: false as const,
      status: 503 as const,
      error:
        error instanceof Error
          ? error.message
          : "Service role indisponível no servidor.",
    };
  }
}

export async function requireLocalAgendaContext(input?: {
  requireTenantManager?: boolean;
}): Promise<
  | {
      ok: true;
      user: LocalUser;
      tenantId: string;
      supabase: ReturnType<typeof createServiceRoleClient>;
    }
  | LocalRouteContextError
> {
  const user = await getCurrentUserFromServerCookies();
  if (!user) return { ok: false, status: 401, error: "Sessão expirada." };
  if (!AGENDA_ROLES.has(user.role)) {
    return { ok: false, status: 403, error: "Sem permissão." };
  }
  if (input?.requireTenantManager && !TENANT_MANAGER_ROLES.has(user.role)) {
    return { ok: false, status: 403, error: "Sem permissão." };
  }
  if (!user.tenantId) {
    return { ok: false, status: 400, error: "Tenant inválido." };
  }

  const service = createLocalServiceClient();
  if (!service.ok) {
    return { ok: false, status: service.status, error: service.error };
  }

  return {
    ok: true,
    user,
    tenantId: user.tenantId,
    supabase: service.client,
  };
}

export async function requireLocalPlatformAdminContext(): Promise<
  | {
      ok: true;
      user: LocalUser;
      supabase: ReturnType<typeof createServiceRoleClient>;
    }
  | LocalRouteContextError
> {
  const user = await getCurrentUserFromServerCookies();
  if (!user) return { ok: false, status: 401, error: "Sessão expirada." };
  if (user.tenantId !== null || !PLATFORM_ADMIN_ROLES.has(user.role)) {
    return { ok: false, status: 403, error: "Sem permissão." };
  }

  const service = createLocalServiceClient();
  if (!service.ok) {
    return { ok: false, status: service.status, error: service.error };
  }

  return {
    ok: true,
    user,
    supabase: service.client,
  };
}
