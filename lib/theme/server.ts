import { cookies } from "next/headers";
import { getCurrentUserFromServerCookies } from "@/lib/auth/local-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  THEME_COOKIE_NAME,
  isAccentPreset,
  isThemeMode,
  parseThemeCookie,
  type AccentPreset,
  type ThemeMode,
  type ThemePrefs,
} from "./shared";

export type ResolvedTheme = ThemePrefs & {
  userOverride: ThemePrefs | null;
  clinicDefault: ThemePrefs | null;
  source: "user" | "clinic" | "cookie" | "default";
};

export async function resolveThemeForRequest(): Promise<ResolvedTheme> {
  const cookieStore = await cookies();
  const cookieRaw = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const cookiePrefs = parseThemeCookie(cookieRaw);

  const user = await getCurrentUserFromServerCookies();
  const supabase = createServiceRoleClient();

  if (!user) {
    if (cookiePrefs) {
      return {
        accent: cookiePrefs.accent,
        mode: cookiePrefs.mode,
        userOverride: null,
        clinicDefault: null,
        source: "cookie",
      };
    }
    return {
      accent: DEFAULT_ACCENT,
      mode: DEFAULT_MODE,
      userOverride: null,
      clinicDefault: null,
      source: "default",
    };
  }

  const { data: profile } = await supabase
    .schema("clinic")
    .from("profiles")
    .select("tenant_id, theme_accent_preset, theme_mode")
    .eq("id", user.userId)
    .maybeSingle();

  const userOverride: ThemePrefs | null = profile
    ? {
        accent: isAccentPreset(profile.theme_accent_preset)
          ? (profile.theme_accent_preset as AccentPreset)
          : DEFAULT_ACCENT,
        mode: isThemeMode(profile.theme_mode)
          ? (profile.theme_mode as ThemeMode)
          : DEFAULT_MODE,
      }
    : null;

  const hasUserAccent = Boolean(
    profile?.theme_accent_preset && isAccentPreset(profile.theme_accent_preset),
  );
  const hasUserMode = Boolean(
    profile?.theme_mode && isThemeMode(profile.theme_mode),
  );

  let clinicDefault: ThemePrefs | null = null;
  if (profile?.tenant_id) {
    const { data: clinicTheme } = await supabase
      .schema("clinic")
      .from("clinic_theme_settings")
      .select("default_accent_preset, default_mode")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (clinicTheme) {
      clinicDefault = {
        accent: isAccentPreset(clinicTheme.default_accent_preset)
          ? (clinicTheme.default_accent_preset as AccentPreset)
          : DEFAULT_ACCENT,
        mode: isThemeMode(clinicTheme.default_mode)
          ? (clinicTheme.default_mode as ThemeMode)
          : DEFAULT_MODE,
      };
    }
  }

  const accent: AccentPreset = hasUserAccent
    ? (profile!.theme_accent_preset as AccentPreset)
    : clinicDefault?.accent ?? DEFAULT_ACCENT;

  const mode: ThemeMode = hasUserMode
    ? (profile!.theme_mode as ThemeMode)
    : clinicDefault?.mode ?? DEFAULT_MODE;

  const source: ResolvedTheme["source"] =
    hasUserAccent || hasUserMode ? "user" : clinicDefault ? "clinic" : "default";

  return { accent, mode, userOverride, clinicDefault, source };
}
