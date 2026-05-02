"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess } from "@/lib/ui/notify";
import { queryKeys } from "@/lib/query/keys";

type Tenant = { id: string; name: string | null; slug: string | null };

type ApiUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  profile: null | {
    fullName: string;
    role: string;
    tenantId: string | null;
    tenant: Tenant | null;
  };
};

type PlatformUsersResponse = {
  users: ApiUser[];
  tenants: Tenant[];
};

async function fetchPlatformUsers(): Promise<PlatformUsersResponse> {
  const res = await fetch("/api/plataforma/usuarios", { cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    users?: ApiUser[];
    tenants?: Tenant[];
  };
  if (!res.ok) {
    throw new Error(body.error ?? "Falha ao carregar usuários.");
  }
  return {
    users: body.users ?? [],
    tenants: body.tenants ?? [],
  };
}

export function PlatformUsersPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.platform.users(),
    queryFn: fetchPlatformUsers,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const users = query.data?.users ?? [];
  const tenants = query.data?.tenants ?? [];
  const loading = query.isLoading || query.isFetching;

  async function refresh() {
    setError(null);
    setRecoveryLink(null);
    const result = await queryClient.invalidateQueries({
      queryKey: queryKeys.platform.users(),
    });
    return result;
  }

  const tenantOptions = useMemo(() => {
    return [{ id: "", label: "Sem clínica (global)" }].concat(
      tenants.map((t) => ({
        id: t.id,
        label: t.name ? `${t.name}${t.slug ? ` (/${t.slug})` : ""}` : t.id,
      })),
    );
  }, [tenants]);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setRecoveryLink(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const fullName = String(fd.get("fullName") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const role = String(fd.get("role") ?? "clinic_admin");
    const tenantIdRaw = String(fd.get("tenantId") ?? "");
    const tenantId = tenantIdRaw ? tenantIdRaw : null;

    setSaving(true);
    try {
      const res = await fetch("/api/plataforma/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, password, role, tenantId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = body.error ?? "Não foi possível criar o usuário.";
        setError(msg);
        notifyError(null, msg);
        return;
      }
      notifySuccess("Usuário criado.");
      e.currentTarget.reset();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateProfile(userId: string, patch: { role?: string; tenantId?: string | null }) {
    setError(null);
    setRecoveryLink(null);
    setSaving(true);
    try {
      const res = await fetch("/api/plataforma/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg = body.error ?? "Falha ao atualizar usuário.";
        setError(msg);
        notifyError(null, msg);
        return;
      }
      notifySuccess("Perfil atualizado.");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function loginAs(userId: string) {
    confirm({
      title: "Entrar como usuário",
      description:
        "Você será desconectado como superadmin neste navegador e entrará na sessão do usuário escolhido.",
      confirmLabel: "Continuar",
      onConfirm: async () => {
        setError(null);
        setRecoveryLink(null);
        setSaving(true);
        try {
          const res = await fetch("/api/plataforma/entrar-como", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            actionLink?: string | null;
          };
          if (!res.ok) {
            const msg = body.error ?? "Falha ao gerar acesso.";
            setError(msg);
            notifyError(null, msg);
            throw new Error(msg);
          }
          const href = body.actionLink;
          if (!href) {
            const msg = "Link de acesso não retornado.";
            setError(msg);
            notifyError(null, msg);
            throw new Error(msg);
          }
          window.location.assign(href);
        } finally {
          setSaving(false);
        }
      },
    });
  }

  async function generateRecovery(userId: string) {
    setError(null);
    setRecoveryLink(null);
    setSaving(true);
    try {
      const res = await fetch("/api/plataforma/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        actionLink?: string | null;
      };
      if (!res.ok) {
        setError(body.error ?? "Falha ao gerar link de recuperação.");
        return;
      }
      setRecoveryLink(body.actionLink ?? null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {confirmDialog}
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-subtle">
          Administração global
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Usuários da plataforma
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Controle global de acessos: atribuição de cargos (role), vínculo com clínica (tenant),
          redefinição de senha e <span className="font-medium text-ink">entrar como</span> outro
          usuário (suporte), com redirecionamento para a área correta (clínica ou plataforma).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
          <CardDescription>
            Cria usuário no Auth e define o perfil no schema <span className="font-medium">clinic</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createUser}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required placeholder="pessoa@clinica.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" name="fullName" required minLength={2} placeholder="Nome Sobrenome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha inicial</Label>
              <Input id="password" name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Cargo (role)</Label>
              <select
                id="role"
                name="role"
                className="h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                defaultValue="clinic_admin"
              >
                <option value="clinic_admin">clinic_admin</option>
                <option value="agent">agent</option>
                <option value="owner">owner (superadmin se sem clínica)</option>
                <option value="platform_super_admin">platform_super_admin (legado)</option>
                <option value="pending_registration">pending_registration</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tenantId">Clínica (tenant)</Label>
              <select
                id="tenantId"
                name="tenantId"
                className="h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                defaultValue=""
              >
                {tenantOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {(error || (query.isError && query.error instanceof Error)) && (
              <p className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {error ??
                  (query.error instanceof Error ? query.error.message : null)}
              </p>
            )}

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Criar usuário"}
              </Button>
              <Button type="button" variant="secondary" onClick={refresh} disabled={loading || saving}>
                {loading ? "Carregando…" : "Atualizar lista"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="rounded-[1.75rem] bg-surface p-6 shadow-lift ring-1 ring-line md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-ink">Usuários</h2>
          <p className="text-xs text-ink-muted">{users.length} total</p>
        </div>

        {recoveryLink && (
          <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-subtle">
              Link de recuperação
            </p>
            <p className="mt-2 break-all text-xs text-ink">{recoveryLink}</p>
          </div>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-ink-muted">Carregando…</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Nenhum usuário encontrado.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {users.map((u) => (
              <li key={u.id} className="rounded-xl bg-muted/50 px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{u.email ?? "sem e-mail"}</p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      id: <span className="font-mono">{u.id}</span>
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      último login: {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString("pt-BR") : "—"}
                      {" · "}
                      e-mail confirmado: {u.emailConfirmedAt ? "sim" : "não"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      <select
                        className="h-9 w-56 rounded-md border border-line bg-canvas px-2 text-sm text-ink shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                        value={u.profile?.role ?? "pending_registration"}
                        onChange={(e) => updateProfile(u.id, { role: e.target.value })}
                        disabled={saving}
                      >
                        <option value="clinic_admin">clinic_admin</option>
                        <option value="agent">agent</option>
                        <option value="owner">owner</option>
                        <option value="platform_super_admin">platform_super_admin</option>
                        <option value="pending_registration">pending_registration</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Clínica</Label>
                      <select
                        className="h-9 w-56 rounded-md border border-line bg-canvas px-2 text-sm text-ink shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                        value={u.profile?.tenantId ?? ""}
                        onChange={(e) =>
                          updateProfile(u.id, { tenantId: e.target.value ? e.target.value : null })
                        }
                        disabled={saving}
                      >
                        {tenantOptions.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => loginAs(u.id)}
                        disabled={saving || !u.email}
                        title={!u.email ? "Usuário sem e-mail" : undefined}
                      >
                        Entrar como
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => generateRecovery(u.id)} disabled={saving}>
                        Link de senha
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

