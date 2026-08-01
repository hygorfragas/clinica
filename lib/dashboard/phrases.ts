import type { ClinicSupabaseClient } from "@/lib/clients/clinical-tenant-context";
import { getClinicLocalParts } from "@/lib/dates";

export type PhraseCategory =
  | "motivational" // 💪 produtividade
  | "hopeful" // 🌈 esperança
  | "joyful" // 😄 alegres com humor
  | "warm"; // 🤗 carinhosas

/** "morning" = Bom dia, "afternoon" = Boa tarde, "evening" = Boa noite. */
export type DayPeriod = "morning" | "afternoon" | "evening";

export function periodForHour(hour: number): DayPeriod {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * Mapa de qual conjunto de categorias é candidato em cada combinação
 * `weekday × period`. Quando há mais de uma categoria na lista, a frase
 * exibida é sorteada uniformemente entre todas as ativas dessas categorias.
 *
 * weekday: 0 = domingo … 6 = sábado (igual `Date.getDay()`).
 *
 * Definido pelo CEO em 2026-05-02:
 *   - Segunda Bom dia → motivacional
 *   - Segunda Boa tarde → aleatório entre esperança/alegres/carinhosas
 *   - Demais combinações: distribuídas para variar o humor da semana.
 */
const ROTATION: Record<number, Record<DayPeriod, PhraseCategory[]>> = {
  // Domingo
  0: {
    morning: ["hopeful"],
    afternoon: ["warm"],
    evening: ["hopeful"],
  },
  // Segunda — exemplo do CEO
  1: {
    morning: ["motivational"],
    afternoon: ["hopeful", "joyful", "warm"],
    evening: ["warm"],
  },
  // Terça
  2: {
    morning: ["hopeful"],
    afternoon: ["motivational"],
    evening: ["warm"],
  },
  // Quarta
  3: {
    morning: ["motivational"],
    afternoon: ["warm"],
    evening: ["joyful"],
  },
  // Quinta
  4: {
    morning: ["hopeful"],
    afternoon: ["motivational", "joyful"],
    evening: ["warm"],
  },
  // Sexta
  5: {
    morning: ["joyful"],
    afternoon: ["joyful"],
    evening: ["warm"],
  },
  // Sábado
  6: {
    morning: ["warm"],
    afternoon: ["joyful"],
    evening: ["warm"],
  },
};

/** Retorna as categorias candidatas para uma data específica (fuso da clínica). */
export function categoriesForMoment(date: Date): PhraseCategory[] {
  const { hour, weekday } = getClinicLocalParts(date);
  const period = periodForHour(hour);
  return ROTATION[weekday]?.[period] ?? ["motivational"];
}

/**
 * Seleciona uma frase aleatória do banco respeitando a rotação por dia/período.
 * Se a tabela estiver vazia ou houver erro, retorna `null`.
 */
export async function pickPhraseForMoment(
  supabase: ClinicSupabaseClient,
  date: Date = new Date(),
): Promise<{ text: string; category: PhraseCategory } | null> {
  const categories = categoriesForMoment(date);

  const { data, error } = await supabase
    .from("dashboard_phrases")
    .select("text, category")
    .eq("is_active", true)
    .in("category", categories);

  if (error) {
    console.error("[dashboard/phrases] failed to load:", error);
    return null;
  }
  if (!data || data.length === 0) return null;

  const idx = Math.floor(Math.random() * data.length);
  const row = data[idx];
  return { text: row.text, category: row.category as PhraseCategory };
}
