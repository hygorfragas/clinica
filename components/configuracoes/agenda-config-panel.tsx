"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Settings = {
  googleSyncMode: "off" | "pull" | "webhook";
  pullIntervalMinutes: number;
  defaultSlotMinutes: number;
  defaultCalendarId: string | null;
  timezone: string;
  businessHours: { start: string; end: string; days: number[] };
  googleCredentials: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    syncSecret: string;
  };
};

type Connection = {
  id: string;
  google_account_email: string | null;
  calendar_id: string | null;
  created_at: string;
} | null;

type SyncState = {
  last_synced_at: string | null;
  last_error: string | null;
} | null;

type Props = {
  settings: Settings;
  connection: Connection;
  syncState: SyncState;
  canManage: boolean;
  googleProviderConfigured: boolean;
  callbackParams: { success: boolean; error: string | null };
};

type GoogleDiagnosticResult = {
  ok: boolean;
  connected: boolean;
  providerConfigured: boolean;
  message: string;
  missingProviderKeys?: string[];
  accountEmail?: string | null;
  calendarId?: string | null;
  calendarSummary?: string | null;
};

const WEEK_DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
] as const;

export function AgendaConfigPanel({
  settings: initial,
  connection,
  syncState,
  canManage,
  googleProviderConfigured,
  callbackParams,
}: Props) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<GoogleDiagnosticResult | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(
    callbackParams.success
      ? "Conta Google vinculada com sucesso."
      : callbackParams.error
        ? `Falha ao vincular Google: ${callbackParams.error}`
        : null,
  );

  function toggleDay(day: number) {
    setSettings((s) => {
      const has = s.businessHours.days.includes(day);
      return {
        ...s,
        businessHours: {
          ...s.businessHours,
          days: has
            ? s.businessHours.days.filter((d) => d !== day)
            : [...s.businessHours.days, day].sort((a, b) => a - b),
        },
      };
    });
  }

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/agenda/google/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(body?.error ?? "Falha ao salvar configurações.");
      } else {
        setFeedback("Configurações salvas.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm("Desvincular conta Google? Os eventos existentes permanecem no sistema.")) return;
    setDisconnecting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/agenda/google/disconnect", {
        method: "POST",
      });
      if (res.ok) {
        location.reload();
      } else {
        const body = await res.json().catch(() => ({}));
        setFeedback(body?.error ?? "Falha ao desconectar.");
      }
    } finally {
      setDisconnecting(false);
    }
  }

  async function runSync() {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/agenda/google/sync", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setFeedback(
          `Sync concluído. ${body.upserted ?? 0} itens atualizados, ${body.deleted ?? 0} removidos.`,
        );
      } else {
        setFeedback(body?.error ?? "Falha ao sincronizar.");
      }
    } finally {
      setSyncing(false);
    }
  }

  async function runDiagnostics() {
    setDiagnosing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/agenda/google/test");
      const body = (await res.json().catch(() => ({}))) as Partial<GoogleDiagnosticResult> & {
        error?: string;
      };
      if (!res.ok && !body.message) {
        setDiagnostics({
          ok: false,
          connected: false,
          providerConfigured: false,
          message: body.error ?? "Falha ao testar a integração Google.",
        });
        return;
      }
      setDiagnostics({
        ok: Boolean(body.ok),
        connected: Boolean(body.connected),
        providerConfigured: Boolean(body.providerConfigured),
        message: body.message ?? "Teste concluído.",
        missingProviderKeys: body.missingProviderKeys,
        accountEmail: body.accountEmail,
        calendarId: body.calendarId,
        calendarSummary: body.calendarSummary,
      });
    } finally {
      setDiagnosing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Google Agenda
        </h1>
        <p className="text-sm text-ink-muted">
          Vincule sua conta Google e escolha como sincronizar: puxando mudanças
          em intervalos (pull) ou, quando houver URL pública, via webhook em
          tempo real.
        </p>
      </header>

      {feedback && (
        <p
          role="status"
          className={cn(
            "rounded-md px-3 py-2 text-sm",
            callbackParams.error
              ? "bg-destructive/5 text-destructive"
              : "bg-brand-soft text-brand",
          )}
        >
          {feedback}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conexão</CardTitle>
          <CardDescription>
            Sua conta Google autoriza o sistema a criar e ler eventos do seu
            calendário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!googleProviderConfigured && (
            <p className="rounded-md bg-destructive/5 p-3 text-sm text-destructive">
              Configure as credenciais OAuth Google nesta tela (client ID,
              client secret, redirect URI e sync secret) antes de conectar a
              conta.
            </p>
          )}

          {connection ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">
                  {connection.google_account_email ?? "Conta vinculada"}
                </p>
                <p className="text-xs text-ink-muted">
                  Calendário: {connection.calendar_id ?? "primary"} · vinculada em{" "}
                  {new Date(connection.created_at).toLocaleString("pt-BR")}
                </p>
                {syncState?.last_synced_at && (
                  <p className="text-xs text-ink-muted">
                    Último pull: {new Date(syncState.last_synced_at).toLocaleString("pt-BR")}
                  </p>
                )}
                {syncState?.last_error && (
                  <p className="text-xs text-destructive">
                    Erro no último sync: {syncState.last_error}
                  </p>
                )}
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={runDiagnostics}
                    disabled={diagnosing}
                  >
                    {diagnosing ? "Testando…" : "Testar integração"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={runSync}
                    disabled={syncing}
                  >
                    {syncing ? "Sincronizando…" : "Sincronizar agora"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={disconnect}
                    disabled={disconnecting}
                    className="text-destructive hover:text-destructive"
                  >
                    {disconnecting ? "Desconectando…" : "Desconectar"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-muted">
                Nenhuma conta vinculada ainda.
              </p>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={runDiagnostics}
                    disabled={diagnosing}
                  >
                    {diagnosing ? "Testando…" : "Testar integração"}
                  </Button>
                  {googleProviderConfigured && (
                    <a href="/api/agenda/google/connect">
                      <Button type="button" size="sm">
                        Conectar Google Agenda
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {diagnostics && (
            <div
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                diagnostics.ok
                  ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700"
                  : "border-destructive/25 bg-destructive/5 text-destructive",
              )}
            >
              <p>{diagnostics.message}</p>
              {diagnostics.accountEmail && (
                <p className="text-xs opacity-80">
                  Conta: {diagnostics.accountEmail}
                </p>
              )}
              {diagnostics.calendarId && (
                <p className="text-xs opacity-80">
                  Calendário: {diagnostics.calendarId}
                  {diagnostics.calendarSummary
                    ? ` (${diagnostics.calendarSummary})`
                    : ""}
                </p>
              )}
              {diagnostics.missingProviderKeys?.length ? (
                <p className="text-xs opacity-80">
                  Campos pendentes: {diagnostics.missingProviderKeys.join(", ")}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais Google OAuth</CardTitle>
          <CardDescription>
            Estes dados ficam salvos na configuração da clínica e são usados no
            fluxo de conexão e sincronização do Google Agenda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="googleClientId">Client ID</Label>
              <Input
                id="googleClientId"
                value={settings.googleCredentials.clientId}
                placeholder="xxxxxxxx.apps.googleusercontent.com"
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    googleCredentials: {
                      ...s.googleCredentials,
                      clientId: e.target.value,
                    },
                  }))
                }
                disabled={!canManage}
              />
            </div>
            <div>
              <Label htmlFor="googleClientSecret">Client secret</Label>
              <Input
                id="googleClientSecret"
                type="password"
                value={settings.googleCredentials.clientSecret}
                placeholder="GOCSPX-..."
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    googleCredentials: {
                      ...s.googleCredentials,
                      clientSecret: e.target.value,
                    },
                  }))
                }
                disabled={!canManage}
              />
            </div>
            <div>
              <Label htmlFor="googleRedirectUri">Redirect URI</Label>
              <Input
                id="googleRedirectUri"
                value={settings.googleCredentials.redirectUri}
                placeholder="https://seu-dominio.com/api/agenda/google/callback"
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    googleCredentials: {
                      ...s.googleCredentials,
                      redirectUri: e.target.value,
                    },
                  }))
                }
                disabled={!canManage}
              />
            </div>
            <div>
              <Label htmlFor="googleSyncSecret">Sync secret (min. 24 chars)</Label>
              <Input
                id="googleSyncSecret"
                type="password"
                value={settings.googleCredentials.syncSecret}
                placeholder="Segredo para cifrar token do Google"
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    googleCredentials: {
                      ...s.googleCredentials,
                      syncSecret: e.target.value,
                    },
                  }))
                }
                disabled={!canManage}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sincronização</CardTitle>
          <CardDescription>
            Modo pull recomendado no MVP. Webhook exige URL pública — pode
            ativar depois quando já tiver domínio estável.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="syncMode">Modo</Label>
            <select
              id="syncMode"
              value={settings.googleSyncMode}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  googleSyncMode: e.target.value as Settings["googleSyncMode"],
                }))
              }
              className="mt-1 flex h-10 w-full rounded-md border border-line bg-[#f3f1ee] px-3 text-sm"
              disabled={!canManage}
            >
              <option value="off">Desligado</option>
              <option value="pull">Pull incremental (syncToken)</option>
              <option value="webhook">Webhook (requer URL pública)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pull">Intervalo de pull (min)</Label>
              <Input
                id="pull"
                type="number"
                min={1}
                max={1440}
                value={settings.pullIntervalMinutes}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    pullIntervalMinutes: Number(e.target.value) || 5,
                  }))
                }
                disabled={!canManage || settings.googleSyncMode !== "pull"}
              />
            </div>
            <div>
              <Label htmlFor="calendar">ID do calendário (padrão: primary)</Label>
              <Input
                id="calendar"
                value={settings.defaultCalendarId ?? ""}
                placeholder="primary"
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    defaultCalendarId: e.target.value || null,
                  }))
                }
                disabled={!canManage}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horário de atendimento</CardTitle>
          <CardDescription>
            Define a faixa de horário visível por padrão na agenda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="bhstart">Início</Label>
              <Input
                id="bhstart"
                type="time"
                value={settings.businessHours.start}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    businessHours: { ...s.businessHours, start: e.target.value },
                  }))
                }
                disabled={!canManage}
              />
            </div>
            <div>
              <Label htmlFor="bhend">Fim</Label>
              <Input
                id="bhend"
                type="time"
                value={settings.businessHours.end}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    businessHours: { ...s.businessHours, end: e.target.value },
                  }))
                }
                disabled={!canManage}
              />
            </div>
            <div>
              <Label htmlFor="slot">Slot padrão (min)</Label>
              <Input
                id="slot"
                type="number"
                min={5}
                max={240}
                step={5}
                value={settings.defaultSlotMinutes}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    defaultSlotMinutes: Number(e.target.value) || 30,
                  }))
                }
                disabled={!canManage}
              />
            </div>
          </div>
          <div>
            <Label>Dias</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEK_DAYS.map((d) => {
                const active = settings.businessHours.days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    disabled={!canManage}
                    onClick={() => toggleDay(d.value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-brand text-white"
                        : "bg-muted text-ink-muted hover:text-ink",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      )}
    </div>
  );
}
