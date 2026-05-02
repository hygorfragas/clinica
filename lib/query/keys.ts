/**
 * Chaves centralizadas para queries do TanStack Query.
 *
 * Padrão: primeira posição identifica o domínio ("agenda", "clients",
 * "plataforma"); posições seguintes carregam filtros serializáveis.
 */
export const queryKeys = {
  agenda: {
    root: ["agenda"] as const,
    list: (params: { from: string; to: string }) =>
      ["agenda", "list", params.from, params.to] as const,
    settings: () => ["agenda", "settings"] as const,
    upcoming: (tenantId: string) =>
      ["agenda", "upcoming", tenantId] as const,
  },
  clients: {
    root: ["clients"] as const,
    list: (filters?: { search?: string }) =>
      ["clients", "list", filters?.search ?? ""] as const,
    detail: (clientId: string) => ["clients", "detail", clientId] as const,
  },
  sales: {
    root: ["sales"] as const,
    list: () => ["sales", "list"] as const,
    completeness: (clientId: string) =>
      ["sales", "completeness", clientId] as const,
  },
  budgets: {
    root: ["budgets"] as const,
    byClient: (clientId: string) => ["budgets", "byClient", clientId] as const,
  },
  platform: {
    clinics: () => ["platform", "clinics"] as const,
    users: () => ["platform", "users"] as const,
  },
} as const;

export type QueryKeyTree = typeof queryKeys;
