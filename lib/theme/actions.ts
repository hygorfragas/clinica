"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  THEME_COOKIE_NAME,
  isAccentPreset,
  isThemeMode,
  serializeThemeCookie,
  type AccentPreset,
  type ThemeMode,
} from "./shared";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? Record<string, never> : { data: T }))
  | { ok: false; error: string };

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

async function writeThemeCookie(accent: AccentPreset, mode: ThemeMode) {
  const jar = await cookies();
  jar.set({
    name: THEME_COOKIE_NAME,
    value: serializeThemeCookie({ accent, mode }),
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function saveUserTheme(input: {
  accent: AccentPreset | null;
  mode: ThemeMode | null;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const accent = input.accent === null ? null : input.accent;
  const mode = input.mode === null ? null : input.mode;

  if (accent !== null && !isAccentPreset(accent)) {
    return { ok: false, error: "Paleta inválida." };
  }
  if (mode !== null && !isThemeMode(mode)) {
    return { ok: false, error: "Modo inválido." };
  }

  const { error } = await supabase
    .schema("clinic")
    .from("profiles")
    .update({
      theme_accent_preset: accent,
      theme_mode: mode,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  // Para o cookie (usado no SSR/anti-FOUC), gravamos o efetivo resolvido:
  // se o usuário limpou, caímos no default da clínica (ou do sistema).
  let effectiveAccent: AccentPreset = accent ?? DEFAULT_ACCENT;
  let effectiveMode: ThemeMode = mode ?? DEFAULT_MODE;

  if (accent === null || mode === null) {
    const { data: profile } = await supabase
      .schema("clinic")
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.tenant_id) {
      const { data: clinicTheme } = await supabase
        .schema("clinic")
        .from("clinic_theme_settings")
        .select("default_accent_preset, default_mode")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (clinicTheme) {
        if (accent === null && isAccentPreset(clinicTheme.default_accent_preset)) {
          effectiveAccent = clinicTheme.default_accent_preset as AccentPreset;
        }
        if (mode === null && isThemeMode(clinicTheme.default_mode)) {
          effectiveMode = clinicTheme.default_mode as ThemeMode;
        }
      }
    }
  }

  await writeThemeCookie(effectiveAccent, effectiveMode);
  revalidatePath("/", "layout");
  return { ok: true } as ActionResult;
}

export async function saveClinicDefaultTheme(input: {
  accent: AccentPreset;
  mode: ThemeMode;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  if (!isAccentPreset(input.accent)) {
    return { ok: false, error: "Paleta inválida." };
  }
  if (!isThemeMode(input.mode)) {
    return { ok: false, error: "Modo inválido." };
  }

  const { data: profile } = await supabase
    .schema("clinic")
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) {
    return { ok: false, error: "Usuário sem clínica vinculada." };
  }
  if (profile.role !== "owner" && profile.role !== "clinic_admin") {
    return { ok: false, error: "Apenas donos ou administradores podem alterar o tema da clínica." };
  }

  const { error } = await supabase
    .schema("clinic")
    .from("clinic_theme_settings")
    .upsert(
      {
        tenant_id: profile.tenant_id,
        default_accent_preset: input.accent,
        default_mode: input.mode,
        updated_by_profile_id: user.id,
      },
      { onConflict: "tenant_id" },
    );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true } as ActionResult;
}

export async function changeOwnPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Sessão expirada." };

  if (input.newPassword.length < 8) {
    return { ok: false, error: "A nova senha precisa ter pelo menos 8 caracteres." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });
  if (signInError) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  const { error } = await supabase.auth.updateUser({ password: input.newPassword });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true } as ActionResult;
}
