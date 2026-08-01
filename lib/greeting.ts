/** Saudação em pt-BR conforme hora civil (0–23) no fuso da clínica. */
export function greetingForHour(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function firstNameFromFullName(fullName: string | null): string {
  if (!fullName?.trim()) return "você";
  return fullName.trim().split(/\s+/)[0] ?? "você";
}
