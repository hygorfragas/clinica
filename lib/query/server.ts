import { QueryClient, type DehydratedState, dehydrate } from "@tanstack/react-query";

/**
 * QueryClient pronto para uso em Server Components.
 *
 * Crie um por request (não compartilhe entre requisições) para evitar vazamento
 * de dados entre usuários. `staleTime` 0 garante que o cliente sempre refetch
 * no primeiro acesso após hidratação.
 */
export function createServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 60_000,
      },
    },
  });
}

/**
 * Serializa o cache do QueryClient server-side para o cliente.
 */
export function dehydrateClient(client: QueryClient): DehydratedState {
  return dehydrate(client);
}
