# Roadmap e plano (sincronizado com ClickUp)

Documento vivo para **controle do que já está pronto**, **onde paramos** e **o que falta**. Deve ser atualizado sempre que uma entrega relevante for concluída, pausada para revisão ou replanejada — em paralelo ao **status e comentários** da task correspondente no ClickUp.

---

## Dados do projeto (referência rápida)

| Item | Valor |
|------|--------|
| **Versão de produto (app)** | `1.0.0` (`package.json`) |
| **Imagem Docker (Docker Hub)** | `hygorfragas/clinica` |
| **Política de tags** | Publicar **sempre** com semver `hygorfragas/clinica:X.Y.Z` antes de qualquer uso de `:latest` — ver `.cursor/rules/10-docker-image-versioning.mdc` |
| **Produção** | Stack ativa; runtime via container (Portainer / compose); variáveis Supabase e `NEXT_PUBLIC_APP_URL` no ambiente |
| **Backend** | Supabase (Auth, Postgres com schema `clinic`, RLS, Storage conforme migrações) |

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
| Fundação Next (stack completa) | `86e0ggp41` | Evoluído: app completo com domínio clínica |
| *(demais)* | *(atualizar ao vincular)* | |

---

## Status geral (leitura rápida)

- **Última atualização:** 2026-05-02
- **Foco atual:** operação em produção; próximas melhorias conforme feedback e roadmap de produto
- **Deploy:** imagem `hygorfragas/clinica` com tag versionada; compose de referência em `docker-compose.yml`

---

## O que já está pronto

Marque entregas verificáveis (código, migração, documento). Referencie PR/commit ou pasta quando fizer sentido.

- [x] **Multitenant** no schema **`clinic`** (RLS, perfis, tenants) — migrações em `supabase/migrations/`.
- [x] **Supabase no app:** clientes SSR/browser, middleware de sessão, tipos, helpers.
- [x] **Auth** e fluxo de aplicação com isolamento por tenant.
- [x] **Agenda**, pacientes, orçamentos/protocolos, evolução e contratos (templates e submissões).
- [x] **Financeiro** (visão geral, categorias, contas, lançamentos, relatórios) — módulo alinhado a migrações dedicadas.
- [x] **Tema/branding** por clínica e preferências de usuário; documentos com identidade.
- [x] **Docker** produção: `Dockerfile` multi-stage Next standalone, `docker/entrypoint.sh` para `NEXT_PUBLIC_*` em runtime, `docker-compose.yml` para Portainer.
- [x] **Produção** — versão estável em uso (release documentado como **1.0.0** no repositório).

---

## Onde paramos

- Sistema **em produção** com stack containerizada.
- Próximos passos de produto: refinar fluxos operacionais, integrações (ex.: Google Calendar por clínica), e itens do PRD ainda não marcados como feitos.

---

## Próximas entregas (ordem sugerida)

1. Manter **sincronia de versão**: ao cada release, subir `package.json`, tag Git se o time usar, e imagem `hygorfragas/clinica:X.Y.Z` antes de `latest`.
2. Evoluções de domínio conforme prioridade clínica (agenda, prontuário, documentos, estoque).
3. Atualizar a tabela **Tarefas ClickUp** acima quando novas tasks forem o fio condutor do trabalho.

---

## Em revisão / depende de decisão

Itens em **Revisar** no ClickUp ou aguardando alguém de fora.

- *(preencher quando houver)*

---

## Histórico resumido (changelog)

Formato sugerido: `AAAA-MM-DD — task — o que mudou (1–2 linhas)`.

- **2026-05-02** — Release **1.0.0** — Produção com stack Docker; documentação de projeto e roadmap atualizados; regra de imagens **sempre com tag semver** (`hygorfragas/clinica:X.Y.Z`) antes de `latest` (`.cursor/rules/10-docker-image-versioning.mdc`); `package.json` e `docker-compose.yml` alinhados à versão e ao registry.
- **2026-03-21** — `86e0ggp42` + `86e0ggp44` — Tipos `clinic`+`public`, clientes SSR/browser, middleware sessão, `.env.example`, Next mínimo; tasks fechadas no ClickUp.

---

## Evolução do produto (linha do tempo macro)

| Período | Marco |
|---------|--------|
| 2026-03 | Fundação: schema `clinic`, Supabase, Next shell, multitenant |
| 2026-04–05 | Domínio clínico ampliado: financeiro, evolução/contratos, tema, branding, Docker para deploy |
| 2026-05-02 | **Go-live documentado:** versão **1.0.0**, produção, política de tags Docker formalizada |

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
