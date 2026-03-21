# Roadmap e plano (sincronizado com ClickUp)

Documento vivo para **controle do que já está pronto**, **onde paramos** e **o que falta**. Deve ser atualizado sempre que uma entrega relevante for concluída, pausada para revisão ou replanejada — em paralelo ao **status e comentários** da task correspondente no ClickUp.

---

## Como usar com o ClickUp

1. **Uma atividade = uma task** no ClickUp (idealmente com ID customizado legível, ex.: `CLIN-12`).
2. No bloco **“Tarefas ClickUp (índice)”** abaixo, mantenha o vínculo `área do plano → link ou ID da task`.
3. Ao **iniciar** trabalho em uma task: seguir a regra do projeto **ClickUp + roadmap** (status **Fazendo**, timer ligado).
4. Ao **terminar** com critério de pronto atendido: status **Complete**, timer desligado, **comentário de relatório** na task, **atualizar este arquivo**.
5. Ao **parar sem concluir** (precisa validação, pendência externa ou entrega parcial): status **Revisar**, timer desligado, comentário com o que falta e **atualizar este arquivo**.

Os nomes de status (**Fazendo**, **Complete**, **Revisar**) devem ser **exatamente** os da lista do seu espaço ClickUp. Se o workspace usar outros nomes, ajuste a lista no ClickUp ou alinhe os nomes na regra `.cursor/rules/08-clickup-roadmap-sincronia.mdc`.

---

## Tarefas ClickUp (índice)

| Área | Task ClickUp (ID ou link) | Notas |
|------|---------------------------|--------|
| Multitenancy + RLS (`clinic`) | `86e0ggp44` | Concluído (banco + tipos + doc) |
| Supabase: envs, tipos, client SSR | `86e0ggp42` | Concluído (repo + Next mínimo para cookies) |
| Fundação Next (stack completa) | `86e0ggp41` | Parcial: app mínimo criado para cumprir SSR; falta shadcn, rotas, layout produto |

---

## Status geral (leitura rápida)

- **Última atualização:** 2026-03-21
- **Foco atual:** Auth + onboarding tenant (`86e0ggp45`) e UI produto
- **Principal risco / bloqueio:** criação de tenant só com service role / Edge Function (ainda não implementado)

---

## O que já está pronto

Marque entregas verificáveis (código, migração, documento). Referencie PR/commit ou pasta quando fizer sentido.

- [x] Migração multitenant no schema **`clinic`** (tabelas MVP + RLS + extensão de `handle_new_user`) — `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` (commit `0ac8dd2`).
- [x] **Supabase no repo:** `lib/supabase/` — `database.types.ts` (public legado + `clinic`), `client.ts`, `server.ts`, `middleware.ts`, `clinic()` helper, `env` Zod; `.env.example`; Next 15 mínimo + `middleware` de sessão.
- [ ] Auth + vínculo tenant + telas de domínio

---

## Onde paramos

- Camada **Supabase + shell Next** pronta para começar **Auth** e **onboarding de tenant**; sem telas de negócio ainda.

---

## Próximas entregas (ordem sugerida)

1. **`86e0ggp45`** — Auth email/senha + perfil `clinic.profiles` + fluxo criar tenant (Edge Function ou server com service role).
2. Completar **`86e0ggp41`** — Tailwind/shadcn, estrutura de pastas do produto (se ainda não considerado “feito”).
3. **`86e0ggp46`** em diante (pacientes, agenda, …).

---

## Em revisão / depende de decisão

Itens em **Revisar** no ClickUp ou aguardando alguém de fora.

- *(preencher)*

---

## Histórico resumido (changelog)

Formato sugerido: `AAAA-MM-DD — task — o que mudou (1–2 linhas)`.

- 2026-03-21 — `86e0ggp42` + `86e0ggp44` — Tipos `clinic`+`public`, clientes SSR/browser, middleware sessão, `.env.example`, Next mínimo; tasks fechadas no ClickUp.

---

## Modelo de relatório (comentário na task + espelho aqui)

Cole no comentário da task ao finalizar ou ao mover para **Revisar**:

```text
## Relatório
- Objetivo da task:
- O que foi feito:
- Onde está (branch / paths / migrações):
- Como validar:
- Riscos / débitos:
- Próximo passo sugerido:
```

Para **Revisar**, enfatize **o que falta** e **por que** não foi para Complete.
