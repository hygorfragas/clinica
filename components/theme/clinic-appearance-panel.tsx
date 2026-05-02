"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccentPicker, ModePicker } from "@/components/theme/theme-pickers";
import { useTheme } from "@/components/theme/theme-provider";
import {
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  type AccentPreset,
  type ThemeMode,
} from "@/lib/theme/shared";

export function ClinicAppearancePanel({
  initial,
}: {
  initial: { accent: AccentPreset; mode: ThemeMode } | null;
}) {
  const { setClinicDefault } = useTheme();
  const [accent, setAccent] = useState<AccentPreset>(initial?.accent ?? DEFAULT_ACCENT);
  const [mode, setMode] = useState<ThemeMode>(initial?.mode ?? DEFAULT_MODE);
  const [saving, startSaving] = useTransition();

  function save() {
    startSaving(async () => {
      await setClinicDefault({ accent, mode });
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modo padrão</CardTitle>
          <CardDescription>
            Define como o sistema aparece para quem ainda não escolheu no próprio perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModePicker value={mode} onChange={setMode} disabled={saving} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paleta padrão</CardTitle>
          <CardDescription>
            Cor de destaque da clínica. Cada profissional pode sobrescrever na tela &ldquo;Meu perfil&rdquo;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccentPicker value={accent} onChange={setAccent} disabled={saving} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving} loadingLabel="Salvando...">
          Salvar padrão da clínica
        </Button>
      </div>
    </div>
  );
}
