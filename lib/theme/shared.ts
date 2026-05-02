export const ACCENT_PRESETS = [
  "salvia",
  "indigo",
  "azul",
  "roxo",
  "rosa",
  "laranja",
  "verde-agua",
  "grafite",
] as const;

export type AccentPreset = (typeof ACCENT_PRESETS)[number];

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const DEFAULT_ACCENT: AccentPreset = "salvia";
export const DEFAULT_MODE: ThemeMode = "light";

export const THEME_COOKIE_NAME = "clinic-theme";

export const ACCENT_LABELS: Record<AccentPreset, string> = {
  salvia: "Sálvia (padrão)",
  indigo: "Índigo",
  azul: "Azul",
  roxo: "Roxo",
  rosa: "Rosa",
  laranja: "Laranja",
  "verde-agua": "Verde-água",
  grafite: "Grafite",
};

export const ACCENT_SWATCHES: Record<AccentPreset, string> = {
  salvia: "#4a655a",
  indigo: "#4f46e5",
  azul: "#2563eb",
  roxo: "#7c3aed",
  rosa: "#db2777",
  laranja: "#ea580c",
  "verde-agua": "#0d9488",
  grafite: "#334155",
};

export const MODE_LABELS: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Seguir sistema",
};

export function isAccentPreset(value: unknown): value is AccentPreset {
  return typeof value === "string" && (ACCENT_PRESETS as readonly string[]).includes(value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export type ThemePrefs = {
  accent: AccentPreset;
  mode: ThemeMode;
};

export function parseThemeCookie(raw: string | undefined | null): ThemePrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object") return null;
    const accent = isAccentPreset((parsed as { accent?: unknown }).accent)
      ? (parsed as { accent: AccentPreset }).accent
      : DEFAULT_ACCENT;
    const mode = isThemeMode((parsed as { mode?: unknown }).mode)
      ? (parsed as { mode: ThemeMode }).mode
      : DEFAULT_MODE;
    return { accent, mode };
  } catch {
    return null;
  }
}

export function serializeThemeCookie(prefs: ThemePrefs): string {
  return encodeURIComponent(JSON.stringify(prefs));
}
