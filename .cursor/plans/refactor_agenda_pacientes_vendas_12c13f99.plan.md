---
name: Refactor agenda pacientes vendas
overview: Reconstruir os módulos de Agenda, Pacientes (com PDF interativo + anamnese + evolução + financeiro), Estoque/Procedimentos e Vendas em 5 fases incrementais, adotando Schedule-X para calendário, Supabase Realtime para sincronia, integração Google Calendar (pull incremental + webhook opcional), e PDF interativo com pdfjs-dist + pdf-lib + Konva, tudo persistido direto no Supabase multitenant.
todos:
  - id: f1_agenda_google
    content: Implementar Agenda completa com Schedule-X, CRUD e sync Google pull incremental com modo alternável para webhook
    status: completed
  - id: f2_pdf_interativo
    content: Implementar templates de anamnese PDF + modo interativo com camada de tinta + persistência Supabase
    status: completed
  - id: f3_ficha_paciente
    content: Reestruturar ficha do paciente para Resumo, Anamnese, Evolução (com fotos), Financeiro
    status: completed
  - id: f4_estoque_procedimentos
    content: Entregar módulos de Estoque e Procedimentos com custo/lucro/preço e contrato obrigatório
    status: completed
  - id: f5_vendas
    content: Criar módulo Vendas com dashboard, projeção e regras de bloqueio por completude do paciente
    status: completed
isProject: false
---

# Plano de refatoração Agenda + Pacientes + Vendas

## Contexto e princípios

- Multitenant: toda tabela nova com `tenant_id`, índices por `tenant_id` e RLS por `tenant_id = auth_tenant_id()`.
- Fonte única de verdade = Supabase Cloud (sem mock/local para dados de negócio).
- Sincronia em tempo quase real via Supabase Realtime (`postgres_changes`).
- Dois modos de UX: `interativo` (tablet/caneta) e `desktop` (formulário), com seletor global.

## Dependências propostas

- Agenda: `@schedule-x/react`, `@schedule-x/calendar`, `@schedule-x/theme-default`, `@schedule-x/event-modal`, `@schedule-x/drag-and-drop`, `@schedule-x/resize`, `@schedule-x/events-service`, `@schedule-x/current-time`.
- Google: `googleapis`, `google-auth-library`.
- PDF interativo: `pdfjs-dist`, `pdf-lib`, `react-konva`, `konva`.
- Projeção de vendas: `recharts`.

## Modelo de dados (novas migrações e extensões)

- `clinic.calendar_settings`: modo sync (`off|pull|webhook`), intervalo pull, calendário default, horários de trabalho.
- `clinic.appointments` (extensão): `google_event_id`, `google_calendar_id`, `google_etag`, `google_sync_status`, `procedure_id`, `source`, etc.
- `clinic.google_calendar_sync_state`: `last_sync_token`, `last_synced_at`.
- `clinic.anamnesis_templates`: template PDF da anamnese, metadados e campos extraídos.
- `clinic.anamnesis_submissions`: payload da ficha (form + tinta/camadas), PDF final renderizado, status de assinatura.
- `clinic.evolution_photos`: fotos vinculadas à evolução (unifica com a aba Evolução).
- `clinic.products`: estoque/produtos com custo e quantidade.
- `clinic.procedures` (extensão): custo, `% lucro`, preço final, contrato padrão obrigatório.
- `clinic.sales`: venda consolidada com método de pagamento, contrato assinado, vínculo com paciente/procedimento/agendamento.
- Trigger/função SQL de completude de paciente para bloquear venda sem requisitos.

## Fluxo de sincronismo (Google)

- Modo padrão escolhido: **Pull incremental com `syncToken` + CRUD imediato sistema→Google**.
- Configuração preparada para alternar depois para **Webhook bidirecional** com URL pública.
- Estratégia:
  - CRUD no sistema grava no Supabase e dispara escrita no Google.
  - Pull incremental (cron) busca mudanças externas e aplica no `appointments`.
  - Realtime propaga para UI imediatamente.

## Fases de entrega (incremental)

## F1 — Agenda completa + integração Google

- Substituir `app/(dashboard)/agenda/page.tsx` por calendário completo com Schedule-X (dia/semana/mês/lista, drag, resize, conflito de horário).
- Criar rotas/API para CRUD de agendamentos.
- Implementar OAuth Google (connect/callback), sincronismo pull incremental e modo selecionável em `Configurações > Agenda`.
- Garantir validação server-side de conflito (retorno com nome da paciente já agendada).

## F2 — Pacientes + Anamnese PDF interativa

- Criar upload de template de anamnese PDF em Configurações.
- Pipeline: parse de campos AcroForm (quando existir), render do PDF base e camada de tinta em cima (Konva).
- Wizard do paciente:
  - salvar cadastro mínimo com `nome + telefone` obrigatório;
  - escolher modo interativo ou desktop;
  - persistir submission da anamnese direto no Supabase.
- Implementar rastreamento de pendências de cadastro para regras de venda.

## F3 — Ficha do paciente reformulada

- Abas finais: `Resumo`, `Anamnese`, `Evolução`, `Financeiro`.
- `Resumo`: foto de perfil (fallback de foto clínica ou ícone padrão).
- `Evolução`: cards sanfona por data/hora/procedimento, com fotos agrupadas por data, upload/câmera e inclusão incremental.
- `Financeiro`: histórico de compras/vendas, forma de pagamento, total gasto, vínculo com evolução e contrato.

## F4 — Estoque + Procedimentos

- Implementar módulo de produtos/estoque com movimentações.
- Procedimentos com custo, lucro em %, preço final calculado e vínculo obrigatório com contrato.
- Integrar procedimentos no restante do sistema (agenda, evolução, vendas).

## F5 — Vendas + projeção

- Nova aba `Vendas` no menu.
- Dashboard com filtros dia/semana/mês e projeção funcional do próximo mês.
- Fluxo `Nova venda`:
  - paciente novo ou existente;
  - validação de completude obrigatória (cadastro completo + anamnese + contrato assinado + fotos/evolução mínima);
  - assinatura de contrato obrigatória em modo interativo.
- Fluxo `Novo agendamento` dentro de Vendas:
  - pode usar paciente incompleto;
  - exige procedimento + data/hora;
  - bloqueia conflito de horário;
  - sincroniza imediatamente com agenda do sistema e Google.

## Riscos e mitigação

- Webhook Google exige URL pública e renovação periódica de channel → deixar preparado e alternável por configuração.
- PDFs sem campos AcroForm → fallback para desenho interativo + campos essenciais do sistema.
- Câmera em tablet depende de HTTPS e permissões → tratar com validação de capacidade e fallback de upload.

## Critério de pronto por fase

- Migração com RLS aplicada.
- Tipos atualizados em `lib/supabase/database.types.ts`.
- `npm run typecheck` verde.
- Smoke test do fluxo principal da fase.
- Atualização do roadmap/ClickUp vinculada.