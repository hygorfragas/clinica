"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  type AccentPreset,
  type ThemeMode,
} from "@/lib/theme/shared";
import { saveClinicDefaultTheme, saveUserTheme } from "@/lib/theme/actions";
import { notifyError, notifySuccess } from "@/lib/ui/notify";

type ThemeContextValue = {
  accent: AccentPreset;
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setAccent: (next: AccentPreset | null) => Promise<void>;
  setMode: (next: ThemeMode | null) => Promise<void>;
  setClinicDefault: (next: { accent: AccentPreset; mode: ThemeMode }) => Promise<void>;
  canEditClinicDefault: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function applyThemeAttributes(accent: AccentPreset, mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-accent", accent);
  html.setAttribute("data-mode", mode);
  const effective = resolveMode(mode);
  html.classList.toggle("dark", effective === "dark");
}

export function ThemeProvider({
  initialAccent,
  initialMode,
  canEditClinicDefault,
  userOverride,
  clinicDefault,
  children,
}: {
  initialAccent: AccentPreset;
  initialMode: ThemeMode;
  canEditClinicDefault: boolean;
  userOverride: { accent: AccentPreset | null; mode: ThemeMode | null } | null;
  clinicDefault: { accent: AccentPreset; mode: ThemeMode } | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [accent, setAccentState] = useState<AccentPreset>(initialAccent);
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolveMode(initialMode));
  const mountedRef = useRef(false);

  useEffect(() => {
    applyThemeAttributes(accent, mode);
    setResolved(resolveMode(mode));
  }, [accent, mode]);

  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next: "light" | "dark" = mq.matches ? "dark" : "light";
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const setAccent = useCallback(
    async (next: AccentPreset | null) => {
      const previous = accent;
      const effective = next ?? clinicDefault?.accent ?? DEFAULT_ACCENT;
      setAccentState(effective);
      const res = await saveUserTheme({
        accent: next,
        mode: userOverride?.mode ?? null,
      });
      if (!res.ok) {
        setAccentState(previous);
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Paleta atualizada.");
      router.refresh();
    },
    [accent, clinicDefault?.accent, router, userOverride?.mode],
  );

  const setMode = useCallback(
    async (next: ThemeMode | null) => {
      const previous = mode;
      const effective = next ?? clinicDefault?.mode ?? DEFAULT_MODE;
      setModeState(effective);
      const res = await saveUserTheme({
        accent: userOverride?.accent ?? null,
        mode: next,
      });
      if (!res.ok) {
        setModeState(previous);
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Modo atualizado.");
      router.refresh();
    },
    [mode, clinicDefault?.mode, router, userOverride?.accent],
  );

  const setClinicDefault = useCallback(
    async (next: { accent: AccentPreset; mode: ThemeMode }) => {
      const res = await saveClinicDefaultTheme(next);
      if (!res.ok) {
        notifyError(null, res.error);
        return;
      }
      notifySuccess("Tema padrão da clínica atualizado.");
      router.refresh();
    },
    [router],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      accent,
      mode,
      resolvedMode: resolved,
      setAccent,
      setMode,
      setClinicDefault,
      canEditClinicDefault,
    }),
    [accent, mode, resolved, setAccent, setMode, setClinicDefault, canEditClinicDefault],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de <ThemeProvider>.");
  }
  return ctx;
}
