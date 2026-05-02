"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccentPicker, ModePicker } from "@/components/theme/theme-pickers";
import { useTheme } from "@/components/theme/theme-provider";
import { changeOwnPassword } from "@/lib/theme/actions";
import {
  ACCENT_LABELS,
  MODE_LABELS,
  type AccentPreset,
  type ThemeMode,
} from "@/lib/theme/shared";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

export function ProfileThemePanel({
  userOverride,
  clinicDefault,
}: {
  userOverride: { accent: AccentPreset | null; mode: ThemeMode | null } | null;
  clinicDefault: { accent: AccentPreset; mode: ThemeMode } | null;
}) {
  const { accent, mode, setAccent, setMode } = useTheme();
  const [saving, startSaving] = useTransition();

  const accentIsOverride = userOverride?.accent != null;
  const modeIsOverride = userOverride?.mode != null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modo de exibição</CardTitle>
          <CardDescription>
            Escolha como o sistema aparece para você. “Seguir sistema” usa a preferência do seu dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ModePicker
            value={mode}
            disabled={saving}
            onChange={(next) => {
              startSaving(async () => {
                await setMode(next);
              });
            }}
          />
          {!modeIsOverride && clinicDefault ? (
            <p className="text-xs text-ink-subtle">
              Usando o padrão da clínica: {MODE_LABELS[clinicDefault.mode]}.
            </p>
          ) : null}
          {modeIsOverride ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => {
                startSaving(async () => {
                  await setMode(null);
                });
              }}
            >
              Voltar ao padrão da clínica
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paleta de destaque</CardTitle>
          <CardDescription>
            Cor usada em botões, links e elementos ativos. Preview aplica imediatamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <AccentPicker
            value={accent}
            disabled={saving}
            onChange={(next) => {
              startSaving(async () => {
                await setAccent(next);
              });
            }}
          />
          {!accentIsOverride && clinicDefault ? (
            <p className="text-xs text-ink-subtle">
              Usando o padrão da clínica: {ACCENT_LABELS[clinicDefault.accent]}.
            </p>
          ) : null}
          {accentIsOverride ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => {
                startSaving(async () => {
                  await setAccent(null);
                });
              }}
            >
              Voltar ao padrão da clínica
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (next.length < 8) {
      notifyError(null, "A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      notifyError(null, "A confirmação precisa ser idêntica à nova senha.");
      return;
    }
    startTransition(async () => {
      const res = await changeOwnPassword({ currentPassword: current, newPassword: next });
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Senha atualizada.");
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trocar senha</CardTitle>
        <CardDescription>
          Confirmamos sua senha atual antes de salvar a nova.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:max-w-md" onSubmit={submit}>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-ink">Senha atual</span>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-ink">Nova senha</span>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-ink">Confirmar nova senha</span>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <Button
            type="submit"
            loading={pending}
            loadingLabel="Salvando..."
            className="w-full sm:w-auto"
          >
            Atualizar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
