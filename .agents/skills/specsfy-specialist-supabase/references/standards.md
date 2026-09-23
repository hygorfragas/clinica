# Padrões e referências Supabase

## Row Level Security

- RLS é avaliada por linha, no Postgres, independente do cliente — a policy
  é a única barreira real quando a API é exposta diretamente ao browser.
- Padrão de policy por operação:

```sql
alter table public.orders enable row level security;

create policy "select_own_orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "insert_own_orders"
  on public.orders for insert
  with check (auth.uid() = user_id);
```

- `USING` filtra linhas visíveis/afetadas (`SELECT`, `UPDATE`, `DELETE`);
  `WITH CHECK` valida a linha resultante (`INSERT`, `UPDATE`) — uma policy
  de `UPDATE` sem `WITH CHECK` permite mudar o próprio registro para um
  estado que a policy de `SELECT` não deveria mais permitir ler, mas não
  impede a escrita inválida em si.
- Indexe toda coluna usada por `USING`/`WITH CHECK` (ex.: `user_id`,
  `tenant_id`) — sem índice, cada linha avaliada pela policy é um scan.
- Funções auxiliares de policy marcadas `SECURITY DEFINER` precisam de
  `SET search_path = ''` (ou schema totalmente qualificado) para não herdar
  um `search_path` manipulável pelo chamador.
- Multi-tenancy: derive `tenant_id` de uma fonte que o usuário não controla
  (claim de JWT emitida pelo servidor, tabela de membership), nunca de um
  campo que o próprio `INSERT`/`UPDATE` do cliente também escreve.

## Matriz de segurança (por recurso)

Para cada tabela/recurso exposto, registre explicitamente:

| Ator | Operação | Predicado de acesso | Origem do claim | Sem sessão (anon) | Teste negativo |
| --- | --- | --- | --- | --- | --- |
| `authenticated` | select | `auth.uid() = user_id` | JWT `sub` | negado | outro usuário não vê a linha |
| `service_role` | all | bypass RLS | chave de servidor | N/A | chave nunca chega ao cliente |

Grants (`GRANT SELECT/INSERT/...`) controlam acesso ao objeto (tabela/coluna);
policies controlam acesso à linha. Os dois precisam estar corretos — grant
sem policy restritiva expõe todas as linhas ao papel.

## Auth e claims

- `auth.uid()` vem do JWT validado pelo GoTrue; confiável para policy.
- Claims customizadas em `raw_app_meta_data` (definidas por processo de
  servidor/admin) são diferentes de `raw_user_meta_data` (editável pelo
  próprio usuário via client SDK) — nunca use a segunda como base de
  autorização.
- `service_role` ignora RLS inteiramente; qualquer código que a usa roda
  apenas em ambiente de servidor confiável e audita cada uso.

## Storage e Realtime

- Bucket público serve qualquer objeto por URL sem checar sessão — use
  apenas para ativos verdadeiramente públicos; para o resto, bucket privado
  com policy de Storage (mesma sintaxe RLS, na tabela `storage.objects`).
- Realtime replica mudanças de tabelas habilitadas; restrinja canais e
  publicação ao mesmo modelo de tenancy das policies — Realtime não aplica
  RLS automaticamente em todas as versões/configurações, então valide se o
  filtro de canal por si só não vaza linha de outro tenant.

## Conexão e pooling

- Conexão direta: poucas conexões persistentes, suporta `LISTEN/NOTIFY` e
  `PREPARE`; adequada para migrations e workers de longa duração.
- Session pool (Supavisor/PgBouncer modo session): compatível com a maioria
  dos recursos do driver, conexão dedicada durante a sessão do cliente.
- Transaction pool: alta concorrência (serverless, edge), mas sem
  `PREPARE`/recursos de sessão entre transações — escolha o modo pelo
  driver e pela carga, não por padrão.

## Padrões operacionais

- Desenvolvimento local (`supabase start`) e migrations como código
  (`supabase migration new`); `supabase db diff` detecta drift antes que
  vire incidente em produção.
- Gerar tipos (`supabase gen types typescript`) após toda mudança de schema
  e falhar o CI quando o arquivo gerado divergir do schema atual.
- Isolar toda operação privilegiada (uso de `service_role`, bypass de RLS)
  em backend controlado e auditável — nunca em função executada pelo
  cliente.

## Fontes oficiais

- Visão geral: https://supabase.com/docs
- Banco: https://supabase.com/docs/guides/database/overview
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Políticas — referência de sintaxe: https://supabase.com/docs/guides/database/postgres/row-level-security#policies
- Auth: https://supabase.com/docs/guides/auth
- Server-side/claims: https://supabase.com/docs/guides/auth/server-side/advanced-guide
- Desenvolvimento local: https://supabase.com/docs/guides/local-development
- Migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Storage: https://supabase.com/docs/guides/storage
- Realtime: https://supabase.com/docs/guides/realtime
- Edge Functions: https://supabase.com/docs/guides/functions
- Connection pooling (Supavisor): https://supabase.com/docs/guides/database/connecting-to-postgres
