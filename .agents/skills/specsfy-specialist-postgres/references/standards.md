# Padrões e referências PostgreSQL

## Decisões de modelagem

- Use `NOT NULL`, `CHECK`, `UNIQUE`, FKs e tipos de domínio quando expressarem invariantes.
- Escolha `jsonb` para dados realmente variáveis, não para evitar modelagem.
- Defina política explícita para timestamps, timezone, dinheiro, IDs e exclusão.
- Avalie índices B-tree, GIN, GiST, BRIN, parciais e por expressão pelo operador usado.

## Operação

- Monitore conexões, locks, deadlocks, lag, bloat, autovacuum e queries lentas.
- Dimensione pool considerando limites do servidor e concorrência efetiva.
- Planeje RPO/RTO, WAL, retenção e restore completo.

## Fontes oficiais

- Manual atual: https://www.postgresql.org/docs/current/
- Tipos: https://www.postgresql.org/docs/current/datatype.html
- Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- Índices: https://www.postgresql.org/docs/current/indexes.html
- Concorrência: https://www.postgresql.org/docs/current/mvcc.html
- EXPLAIN: https://www.postgresql.org/docs/current/using-explain.html
- Roles e privilégios: https://www.postgresql.org/docs/current/user-manag.html
- Backup e restore: https://www.postgresql.org/docs/current/backup.html
