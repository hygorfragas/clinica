# AGENTS.md

## Objetivo do produto
Construir um sistema SaaS multitenant para clínica de estética, focado em agenda, cadastro de pacientes, anamnese digital, ficha de evolução, orçamentos, controle de sessões, documentos com assinatura digital, fotos clínicas e controle básico de estoque.

## Resultado esperado do MVP
Entregar um produto web seguro, simples e operacional para uso diário de uma profissional de estética, substituindo processos manuais e centralizando toda a jornada da paciente.

## Prioridades absolutas
1. Multi-tenant desde o início.
2. Segurança e isolamento de dados por tenant.
3. UX simples para operação por uma profissional.
4. Modelagem correta da jornada da paciente.
5. Código limpo, tipado, testável e fácil de evoluir.
6. Rodar typecheck sempre que alterar um arquivo
7. Sempre fazer um commit quando necessario e criar versionamento.
8. **Docker Hub:** imagem `hygorfragas/clinica`; release com **`npm run docker:push -- X.Y.Z`** (buildx `linux/amd64` no Mac ARM) — ver `.cursor/rules/10-docker-image-versioning.mdc` e `documentacao/docker-build-mac-arm.md`.
9. **Criar PR:** pipeline completa em `.cursor/rules/11-release-pr-pipeline.mdc` (versionamento + git push + Docker + `gh pr create`).

## Stack base
- Frontend: Next.js + React + TypeScript
- UI: Tailwind + shadcn/ui
- Forms: React Hook Form + Zod
- Estado e dados: TanStack Query + Zustand
- Backend: Supabase (Postgres, Auth, Realtime, Edge Functions)
- Storage: Cloudflare R2
- Integrações: Google Calendar
- Visual clínico: React Konva para face mapping

## Regras globais
- Nunca gerar código sem considerar tenant_id e RLS.
- Nunca acessar tabelas sem política explícita de segurança.
- Nunca sugerir armazenamento sensível no cliente sem necessidade.
- Sempre preferir TypeScript estrito e schemas com Zod.
- Sempre propor migrações e contratos de dados claros.
- Sempre considerar auditoria mínima para ações clínicas críticas.
- Em features com arquivos, pensar em R2 + signed URLs.
- Em agenda, considerar sincronização com Google Calendar.
- Em prontuário/fotos/documentos, priorizar privacidade.

## Fluxo principal do negócio
1. Recepção ou busca da paciente
2. Cadastro mínimo ou completo
3. Anamnese digital
4. Agendamento
5. Orçamento/protocolo
6. Atendimento e evolução
7. Sessões/retornos
8. Fotos, documentos e assinaturas
9. Controle de estoque vinculado ao consumo

## Planejamento e ClickUp
- Roadmap e controle do plano: `documentacao/roadmap_e_plano_clickup.md` (manter atualizado com o ClickUp).
- Fluxo por task: regra `.cursor/rules/08-clickup-roadmap-sincronia.mdc` (status **Fazendo** / **Complete** / **Revisar**, timer ao iniciar/parar, comentário de relatório).

## Como responder neste projeto
- Primeiro confirmar entendimento da tarefa.
- Depois propor plano curto.
- Só então sugerir implementação.
- Em mudanças estruturais, listar impacto em banco, API, UI e segurança.
- Em código, preferir exemplos já prontos para produção.

<!-- specsfy:framework:start -->
## Framework Specsfy

Leia e siga integralmente `.specsfy/Spec.md` antes de trabalhar com
backlogs, refinamentos do backlog, especificações, tarefas, testes ou implementação. Esse
arquivo contém o fluxo, os caminhos canônicos e os gates do framework.

- Preserve as instruções próprias deste projeto.
- O diretório do projeto é o caminho informado durante `$specsfy-setup`. Use-o
  em toda leitura e escrita posterior. Se ele estiver dentro de um Hub, não
  promova o trabalho para a raiz Git nem crie contexto, specs ou código fora
  desse caminho.
- Leia `PROJECT.md`, `DESIGNSYSTEM.MD`, `.specsfy/STACK.md`,
  `.specsfy/RULES.md`, `.specsfy/DATABASE.md`, `.specsfy/PACKAGES.md` e
  `.specsfy/USER-PROFILE.md` como contexto persistente antes de planejar
  mudanças.
- Antes de perguntar, consulte `.specsfy/USER-PROFILE.md`, a conversa atual e
  as fontes do projeto. Não repita uma pergunta cuja resposta já esteja
  confirmada; registre respostas novas no perfil com a fonte e o alcance.
- Quando `.specsfy/SPECKIT.md` existir, leia
  `.specify/memory/constitution.md` e cada fonte do GitHub Spec Kit listada na
  projeção. Preserve `.specify/` e os artefatos já existentes em `specs/`; o
  Specsfy não os migra nem os substitui.
- Antes de iniciar qualquer skill do framework, execute obrigatoriamente
  `$specsfy-setup` para verificar e reconciliar o contexto e os blocos
  reservados. A própria `$specsfy-setup` não se chama recursivamente. Em uma
  transição automática, execute-a de novo com a mesma raiz já confirmada antes
  de carregar a skill de destino. Execute `$specsfy-documentator` quando
  `PACKAGES.md` estiver ausente ou desatualizado.
- Execute o monitor de contexto no início, após cada tarefa e antes de concluir
  a entrega; resolva todo resultado `PENDING`.
- Use as skills `specsfy-aux-*` para manter stack, regras e banco sem apagar
  conteúdo humano.
- Toda tarefa que cria ou altera a estrutura do banco inclui uma tarefa
  `[MIGRATION]` com arquivo
  versionado. A implementação aplica a migration no banco de teste e consulta
  seu estado antes de concluir a tarefa ou o Delivery Gate.
- Execute `$specsfy-documentator` depois de cada implementação para reconstruir
  a documentação técnica completa em `docs/` e o registro de dependências em
  `.specsfy/PACKAGES.md`.
- Use `specs/inbox/` para capturas imediatas ainda não refinadas.
- Use `specs/backlog/` para itens refináveis ainda não promovidos.
- Use `specs/<estado>/<NNNN>-<slug>/spec.md` como fonte normativa de cada
  fatia, em uma única pasta de estado.
- Não crie `plan.md`, `tasks.md`, `research.md` ou outra fonte normativa
  paralela.
<!-- specsfy:framework:end -->
