import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1)
    .transform((s) => s.trim())
    .refine(
      (s) => {
        try {
          const u = new URL(s);
          return u.protocol === "https:" || u.protocol === "http:";
        } catch {
          return false;
        }
      },
      "NEXT_PUBLIC_SUPABASE_URL deve ser uma URL http(s) válida (ex.: https://xxxx.supabase.co).",
    ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
});

export type SupabasePublicEnv = z.infer<typeof publicEnvSchema>;

/** True quando URL e anon key estão definidos e válidos (evita 500 na home sem `.env.local`). */
export function isSupabasePublicEnvConfigured(): boolean {
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }).success;
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis públicas do Supabase inválidas: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
