Quick wins de feature — Dashboard e Sistema (SaaS)

 Contexto

 Hoje a dashboard em app/(dashboard)/inicio/page.tsx é minimalista: 3 stat cards (agendamentos do dia,
 total de pacientes, orçamentos em aberto) + uma seção de "Acesso rápido" com 3 links. Os dados que já
 existem no Supabase permitem entregar muito mais valor sem migrações novas. O sistema é SaaS
 multi-tenant, então toda feature aqui precisa ser:

 - Tenant-isolada via requireClinicalTenantContext() ou queries com eq("tenant_id", ...) + RLS,
 - Genérica (nada amarrado à operação específica de uma clínica),
 - Implementável em 1–2 dias usando dados/componentes que já existem,
 - Configurável quando precisar (thresholds, janelas de tempo) — mas com defaults sensatos.

 O objetivo é transformar a dashboard de navegacional em operacional: o usuário abre /inicio e já vê o que
  precisa fazer hoje, sem ter que clicar em 4 menus.

 ---
 Quick wins — Dashboard /inicio

 Ordem sugerida de implementação (alto impacto + baixo esforço primeiro):

 1. Timeline de agendamentos de hoje

 Substituir o stat card "Agendamentos hoje" (apenas count) por uma lista compacta em ordem cronológica
 com:
 horário · paciente · procedimento · status (confirmado/realizado/cancelado).

 - Dados: clinic.appointments joined com clients e procedures no intervalo getDayBoundsUtcIso(now) (helper
  já existe em lib/dates).
 - Componente novo: components/dashboard/today-timeline.tsx (server-rendered).
 - Vazio amigável: "Nenhum agendamento para hoje. [Ver semana →]" → /agenda.
 - Bônus barato: ícone de relógio vermelho no item se faltar < 30 min para começar (mesma lógica do
 NextAppointmentBanner).

 2. Pendências da clínica

 Card unificado com 3–4 chips mostrando contadores acionáveis. Cada chip linka para a tela com o filtro
 pré-aplicado.

 - Orçamentos vencendo em 7 dias: budgets onde status='sent' AND valid_until BETWEEN now AND now+7d.
 - Pacotes terminando: client_procedure_purchases com sessions_remaining ≤ 2 (verificar a coluna real na
 tabela; provável sessions_remaining ou cálculo via total_sessions - sessions_used).
 - Anamneses pendentes: anamnesis_submissions com status='draft' mais antigos que 7 dias.
 - Contratos sem assinar: contract_submissions com status='draft'.
 - Componente novo: components/dashboard/pendencias-card.tsx.

 3. Aniversariantes da semana

 Lista compacta (até 5) de pacientes que fazem aniversário nos próximos 7 dias, com botão "Mandar
 parabéns" que abre https://wa.me/{phone}?text=... (sem disparar nada — só abre o WhatsApp Web
 pré-formatado).

 - Dados: clinic.clients.birth_date (já existe — confirmado em database.types.ts:327). Filtrar por
 mês+dia, hidden_from_ui_at IS NULL.
 - Componente novo: components/dashboard/aniversariantes-card.tsx.
 - Fallback: se a clínica não usa data de nascimento, esconde o card (if (rows.length === 0) return null).

 4. Estoque baixo

 Lista compacta dos top 5 produtos onde stock_quantity <= low_stock_threshold. Cada item linka para o
 produto em /estoque.

 - Dados: clinic.products (colunas stock_quantity e low_stock_threshold já existem — confirmado em
 database.types.ts:1087-1088). Filtrar is_archived = false.
 - Componente novo: components/dashboard/estoque-baixo-card.tsx.
 - Fallback: card só aparece se houver pelo menos 1 produto abaixo do limite.

 5. Faturamento do dia / semana / mês

 Stat triple (3 colunas) com receita líquida, comparando com período anterior (delta % verde/vermelho).

 - Dados: clinic.financial_transactions filtrando kind='income' (ou equivalente do enum em
 lib/financial/schemas.ts) e status = posted/concluído. Reusa lib/financial/queries.ts se já tiver helper
 de "receita por intervalo"; senão é uma query simples por created_at ou posted_at.
 - Permissão: só renderiza se canAccessFinancial(profile) (helper já existe em
 lib/auth/clinic-profile.ts). Caso contrário, esconde silenciosamente.
 - Componente novo: components/dashboard/faturamento-stats.tsx.

 6. Mini-gráfico de receita 14 dias

 Reusar components/sales/sales-chart.tsx (SVG leve, sem libs) com receita diária dos últimos 14 dias.
 Posicionar abaixo do faturamento.

 - Dados: mesma fonte do item 5, agregado por dia.
 - Implementação: importar SalesChart, adaptar input se necessário; sem componente novo se o existente já
 recebe { date, value_cents }[].

 7. Banner "primeiros passos" (onboarding leve)

 Aparece só quando o tenant ainda não configurou o básico — checklist com 4–5 itens:

 - Cadastrar pelo menos 1 procedimento
 - Subir 1 template de anamnese
 - Cadastrar conta financeira (caixa/banco)
 - Conectar Google Calendar (opcional)
 - Configurar branding (logo + cores)

 Some quando todas as etapas forem concluídas. Cada item linka direto para a tela de configuração.

 - Dados: queries count('exact', head=true) em procedures, anamnesis_templates, financial_accounts,
 google_oauth_credentials, clinic_branding.
 - Componente novo: components/dashboard/primeiros-passos-banner.tsx.

 ---
 Quick wins — Sistema (fora da dashboard)

 Mesma régua: 1–2 dias, dados existentes, valor para qualquer clínica.

 A. Lembrete por WhatsApp na ficha do agendamento

 Botão "Enviar lembrete" ao lado de cada appointment futuro. Abre wa.me/{phone_e164}?text={mensagem} com
 mensagem pré-formatada usando clinic_branding.name, data/hora local e procedimento. Não envia
 automaticamente — só prepara o texto.

 - Onde: components/agenda/* (no item da agenda) e na ficha do paciente.
 - Helper novo: lib/agenda/whatsapp.ts com buildAppointmentReminderUrl(appointment, branding).
 - Fallback: se o paciente não tem telefone, o botão fica desabilitado com tooltip.

 B. Filtros avançados em /pacientes

 A lista já ganhou paginação nesta sessão. Adicionar filtros lado-a-lado com a busca:
 - "Aniversariantes do mês"
 - "Sem anamnese"
 - "Com pacote ativo"
 - "Sem atendimento há +60 dias" (retenção)
 - Onde: components/clients/pacientes-lista.tsx.
 - Implementação: filtros aplicados client-side (a query do servidor já trás todos os clients) — coerente
 com a busca atual. Se for necessário cruzar com outras tabelas (anamnese, atendimento), expandir a query
 do server component em app/(dashboard)/pacientes/page.tsx com 2–3 joins de count.

 C. Exportar pacientes em CSV

 Botão "Exportar" na lista de pacientes. Usa o filtro/busca atual. Gera CSV no client (sem dependência) —
 colunas: nome, telefone, e-mail, CPF, nascimento, criado em.

 - Onde: components/clients/pacientes-lista.tsx (botão no header).
 - Helper novo: lib/clients/export-csv.ts com função pura toCsv(rows): string.

 D. Página "Minhas pendências"

 Rota /inicio/pendencias (ou modal a partir do card "Pendências" da dashboard) listando todas as
 pendências do usuário em uma única view com filtros por tipo (orçamento, anamnese, contrato, evolução em
 rascunho).

 - Reutiliza: as mesmas queries do card pendencias-card.tsx (item 2 da dashboard).
 - Diferença: paginação + ações inline (continuar rascunho, ver detalhes).

 E. Cancelamento automático de orçamentos vencidos

 A migration 20260421120000_budgets_auto_cancel.sql já existe. Confirmar se está aplicada no Supabase de
 produção e se o cron está agendado (pg_cron ou Edge Function disparada por scheduled trigger). Caso
 contrário, ativar.

 - Verificação: rodar select * from cron.job; no SQL editor do Supabase pra ver se há um job rodando o
 procedimento.
 - Se não estiver agendado: criar Edge Function diária (supabase/functions/auto-cancel-budgets/) ou
 enabler pg_cron. Ambos são quick wins, mas a Edge Function é mais portável entre projetos SaaS.

 F. LTV no card do paciente

 Mostrar no header da ficha do paciente (app/(dashboard)/pacientes/[clientId]/page.tsx) um chip discreto
 com:
 "R$ 12.340 em compras · 8 sessões realizadas".

 - Dados: agregação simples em sales + procedure_sessions por client_id. Server-rendered.
 - Componente novo: components/clients/paciente-ltv-chip.tsx.

 ---
 Arquivos críticos a modificar

 ┌────────────────────────┬───────────────────────────────────────────────────────────────────────────┐
 │          Item          │                                  Arquivo                                  │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ Toda dashboard         │ app/(dashboard)/inicio/page.tsx (refatorar pra orquestrar os novos cards) │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ Cards novos            │ components/dashboard/*.tsx (diretório novo)                               │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ Reuso gráfico          │ components/sales/sales-chart.tsx                                          │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ Helpers de data        │ lib/dates.ts (getDayBoundsUtcIso já existe)                               │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ Permissões financeiras │ lib/auth/clinic-profile.ts (canAccessFinancial)                           │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ Lembrete WhatsApp      │ components/agenda/*, lib/agenda/whatsapp.ts (novo)                        │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ Filtros pacientes      │ components/clients/pacientes-lista.tsx                                    │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ CSV pacientes          │ lib/clients/export-csv.ts (novo)                                          │
 ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
 │ LTV paciente           │ components/clients/paciente-ltv-chip.tsx (novo), ficha do paciente        │
 └────────────────────────┴───────────────────────────────────────────────────────────────────────────┘

 ---
 Ordem sugerida de execução

 1. Timeline de hoje + Pendências + Estoque baixo (1 dia) — entregam imediatamente uma sensação de
 "dashboard útil".
 2. Aniversariantes + Lembrete WhatsApp (½ dia) — fechamento de loop de engajamento.
 3. Faturamento + mini-gráfico (½ dia) — usa dados existentes, dá visão para gestor.
 4. Banner primeiros passos (½ dia) — onboarding melhora ativação SaaS.
 5. Filtros pacientes + CSV + LTV chip (1 dia) — produtividade da recepção.
 6. Cancelamento automático orçamentos (verificação rápida + ativação) — higiene de dados.

 Total estimado: 3–4 dias de trabalho focado, todas as features são incrementais e podem ir pro deploy em
 qualquer ordem.

 ---
 Verificação end-to-end

 Para cada quick win, validar:

 1. Multi-tenant: criar 2 tenants no Supabase, popular dados em cada um, abrir /inicio logado em cada um —
  não pode haver vazamento (RLS já garante, mas testar a query manualmente também).
 2. Empty states: tenant recém-criado deve mostrar todos os cards no estado vazio sem erro (timeline
 vazia, pendências zeradas, banner de primeiros passos visível, faturamento R$ 0).
 3. Permissões: usuário sem canAccessFinancial não vê faturamento nem mini-gráfico.
 4. Performance: a página /inicio deve carregar em ≤ 1s mesmo com 500 agendamentos no dia. Todas as
 queries da dashboard ficam dentro de um único Promise.all no server component.
 5. Build & types: npx tsc --noEmit limpo + npm run build sem warnings.
 6. Docker (Mac ARM): `npm run docker:push -- X.Y.Z` → atualizar `image:` no compose / Portainer.

---

## ~~Otimizações pendentes~~ — Biblioteca de fotos (`/pacientes/[id]/fotos`) — **Entregue em 1.0.8**

**Problema observado (release 1.0.6):** aba do navegador com ~2 GB de RAM ao abrir a biblioteca com muitas fotos em alta resolução.

**Causa atual:**
- [`fotos/page.tsx`](app/(dashboard)/pacientes/[clientId]/fotos/page.tsx) gera `createSignedUrl` do **original** para cada foto no servidor.
- [`paciente-fotos-biblioteca.tsx`](components/clients/paciente-fotos-biblioteca.tsx) usa a mesma URL no grid e no lightbox — o browser decodifica todas as imagens full size (mesmo com `loading="lazy"`, a memória acumula ao rolar).

**Comportamento desejado:**
1. **Grid / miniatura:** carregar apenas um **proxy** em resolução baixa (ex.: largura máx. 320–480 px, WebP ou JPEG q~75).
2. **Lightbox (visualizar):** buscar **só aquela foto** em qualidade original, sob demanda, ao clicar.

**Abordagens (escolher uma na implementação):**

| Opção | Prós | Contras |
|-------|------|---------|
| **A) Thumb no upload** — ao salvar, gerar `{storage_key}-thumb.webp` no bucket `clinical` | Rápido na leitura; sem CPU no request | Migração/backfill para fotos antigas; mais storage |
| **B) API proxy** — `GET /api/clinical/photos/[id]/thumb?w=400` com `sharp` redimensiona do Storage | Sem duplicar arquivo até ter thumb; funciona para legado | Dep `sharp`; CPU por request; cache HTTP |
| **C) Paginação + lazy** — carregar 24 fotos por página, signed URL só do lote | Mudança menor | Ainda pesado se usuário abrir muitas páginas; não resolve lightbox |

**Recomendação:** **A + B** — thumb no upload para novas fotos; API proxy com cache para fotos antigas sem thumb.

**Arquivos a tocar:**
- `app/(dashboard)/pacientes/[clientId]/fotos/page.tsx` — expor `thumbUrl` + `fullUrl` (ou só `id` e buscar URLs no client).
- `components/clients/paciente-fotos-biblioteca.tsx` — grid usa `thumbUrl`; lightbox chama `getClinicalSignedUrl` / action só ao abrir.
- `lib/clients/record-actions.ts` — gerar thumb no `uploadPatientLibraryPhotos` (e demais uploads de foto).
- Opcional: `app/api/clinical/photos/[photoId]/thumb/route.ts`.

**Critérios de pronto:**
- Abrir biblioteca com 50+ fotos: uso de memória da aba estável (ordem de dezenas de MB, não GB).
- Lightbox abre original nítido em ≤ 2 s.
- Tenant/RLS inalterados; thumb nunca expõe paciente de outro tenant.
- `npm run typecheck` limpo.