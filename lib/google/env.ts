import { z } from "zod";

const schema = z.object({
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  GOOGLE_CALENDAR_SYNC_SECRET: z.string().min(24),
  GOOGLE_CALENDAR_WEBHOOK_BASE_URL: z.string().url().optional(),
});

export type GoogleEnv = z.infer<typeof schema>;

const requiredGoogleEnvKeys = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "GOOGLE_CALENDAR_SYNC_SECRET",
] as const;

type GoogleEnvKey = (typeof requiredGoogleEnvKeys)[number];

export function inspectGoogleEnv(): {
  configured: boolean;
  missingKeys: GoogleEnvKey[];
} {
  const missingKeys = requiredGoogleEnvKeys.filter((key) => {
    const value = process.env[key];
    if (!value) return true;
    if (key === "GOOGLE_CALENDAR_SYNC_SECRET" && value.length < 24) return true;
    return false;
  });
  return { configured: missingKeys.length === 0, missingKeys };
}

export function isGoogleEnvConfigured(): boolean {
  return inspectGoogleEnv().configured && schema.safeParse(process.env).success;
}

export function getGoogleEnv(): GoogleEnv {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Variáveis Google ausentes/ inválidas: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}. Veja .env.example.`,
    );
  }
  return parsed.data;
}

/** Segredo usado para simetricamente cifrar o refresh_token no Postgres
 *  (quando em pull/webhook). No MVP usamos o service role apenas pelo servidor. */
export function getSyncSecret(): string {
  const s = process.env.GOOGLE_CALENDAR_SYNC_SECRET;
  if (!s || s.length < 24) {
    throw new Error(
      "GOOGLE_CALENDAR_SYNC_SECRET não configurada (>=24 chars).",
    );
  }
  return s;
}
