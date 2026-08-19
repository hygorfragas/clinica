# Histórico — Refator do módulo Evolução (clones de Anamnese)

Memória de continuidade. Cada fase é marcada como concluída ao final.

## Escopo

- **Configurações → Evolução** (nova aba): gerencia fichas de evolução em PDF (mesmo fluxo do Anamnese).
- **Paciente → Evolução** deixa de ter formulário livre. Vira lista de submissões baseadas nas fichas escolhidas, com modo Desktop e Interativo (idêntico ao Anamnese).
- A tabela legacy `clinic.evolutions` é preservada (não migra dados), mas a nova UI usa `clinic.evolution_submissions`.

---

## Fases

### Fase 1 — Banco ✅
- [x] Migration: `supabase/migrations/20260502120000_evolution_templates_and_submissions.sql`
- [x] `database.types.ts` atualizado

### Fase 2 — Storage helper ✅
- [x] `buildEvolutionTemplateStoragePath` e `buildEvolutionSubmissionStoragePath` em `lib/clinical/storage.ts`

### Fase 3 — Server actions ✅
- [x] `lib/evolutions/template-actions.ts`
- [x] `lib/evolutions/submission-actions.ts` (com flatten próprio + footer "Registrado por")

### Fase 4 — Refator dos editores compartilhados ✅
- [x] DesktopAnamnesisEditor aceita `entityKind: "anamnesis" | "evolution"`
- [x] InteractiveAnamnesisEditor idem (+ backHref dinâmico)
- [x] AnamnesisSubmissionsPanel parametrizado com COPY_BY_KIND

### Fase 5 — UI: Configurações > Evolução ✅
- [x] `/configuracoes/evolucao/page.tsx`
- [x] `/configuracoes/evolucao/[templateId]/page.tsx` (usa TemplateFieldDesigner com entityKind="evolution")
- [x] `components/evolutions/evolution-templates-manager.tsx`
- [x] Subnav "Evolução" entre Anamnese e Contratos

### Fase 6 — UI: Paciente > Evolução (refeita) ✅
- [x] `app/(dashboard)/pacientes/[clientId]/evolucao/page.tsx` reescrito
- [x] Reusa `AnamnesisSubmissionsPanel` com `entityKind="evolution"`
- [x] Rota interativa: `app/evolucao/interativa/[clientId]/[submissionId]/page.tsx`

### Fase 7 — Verificação ✅
- [x] Typecheck limpo
- [x] Build limpo (todas as 4 rotas novas geradas)

---

## ⚠️ Para colocar em produção

1. **Aplicar migration no Supabase**: `supabase/migrations/20260502120000_evolution_templates_and_submissions.sql`
2. Em **Configurações › Evolução**, fazer upload da(s) ficha(s) PDF.
3. Abrir o designer em cada uma e marcar os campos (texto, sim/não, assinatura, etc.).
4. No paciente, aba **Evolução**, escolher uma ficha e preencher (modo desktop ou tablet/interativo).

---

# Release 1.0.4 — Pipeline mobile + Galeria de fotos da evolução (2026-05-26)

## Bug crítico corrigido

- **Build quebrado por rollback corrompido** em `components/anamnesis/desktop-anamnesis-editor.tsx` (trecho duplicado da função `shortType` em volta da linha 1581). Restaurado.

## Mobile / tablet UX

- **Drawer mobile retrátil** no shell do app (`components/layout/app-shell.tsx` + novo `mobile-nav-drawer.tsx`). Em `<md`, sidebar fica oculta atrás de um hamburger; abre sobreposta ao conteúdo, backdrop, ESC fecha, scroll-lock no body, fecha sozinho ao mudar de rota.
- **Scroll horizontal global eliminado no editor PDF**:
  - `desktop-anamnesis-editor.tsx`: `renderWidth` agora é `Math.min(960, viewerWidth)` (sem piso forçado em 320); `viewerWidth` mínimo baixou de 320→280; removido `minWidth` no slide do `PageCarousel`.
  - `interactive-anamnesis-editor.tsx`: mesma redução; `PageThumbnails` começa colapsada por padrão (SSR) e abre em `md+` via matchMedia.

## Editor PDF — visibilidade dos campos preenchidos

- Bug histórico: no **modo guiado**, ao avançar para o próximo campo, o valor digitado anteriormente sumia da tela (só voltava ao reativar o campo).
- Correção em `FieldOverlay` (`desktop-anamnesis-editor.tsx`): campo inativo agora mostra o valor formatado (helper `formatFieldDisplay` cobre texto, data PT-BR, Sim/Não, checkbox). Assinaturas exibem badge `CheckCircle2` + "Assinado/Rubricado". O `<button>` continua reativando edição ao toque.

## Sidebar do editor — separar campos vs fotos

- Em tablet portrait (md ≤ viewport < lg) o `lg:grid-cols-[minmax(0,1fr)_320px]` ainda é 1 coluna — antes a galeria de fotos empilhava em cima do card "Campo X de Y" e empurrava o preenchimento pra fora da tela.
- Adicionado `SidebarTabs` no `desktop-anamnesis-editor.tsx`: alterna entre **Preencher campos** (GuidedActiveCard + FieldNavigator) e **Fotos clínicas** (o `extraSidebarPanel`). Tabs aparecem só quando há `extraSidebarPanel` (hoje: apenas em evoluções).

## Galeria de fotos clínicas — paginação + swipe + upload

`components/evolutions/evolution-photo-side-panel.tsx` reescrito:

- **Paginação**: 6 fotos por página, controles Ant/Próx, indicador `n/total`, `loading="lazy"` nas thumbs.
- **Swipe horizontal touch** (foleando): touchstart/touchend com threshold de 40px navega entre páginas.
- **Upload dentro do painel** (nova feature):
  - Dois acessos paralelos: **"Tirar foto"** (`capture="environment"` → câmera do iPad/celular) e **"Da galeria"** (multiple).
  - Selector de **Região** + por-foto: **Antes / Depois / Sem marcação**, com legenda opcional e preview thumbnail.
  - Server action `uploadEvolutionSubmissionPhotos` em `lib/clients/record-actions.ts` — aceita `comparison_role` SEM exigir `purchase_id` (diferente de `uploadClinicalPhotosBatch`).
  - Salva `evolution_submission_id` na linha de `clinic.photos`.
- **Filtro Todas / Desta sessão (n)** + badge **"Sessão"** nas fotos vinculadas à `submissionId` atual.
- Action complementar `linkPhotoToEvolutionSubmission` em `lib/evolutions/submission-actions.ts` (vincula foto existente a uma submissão + define `phase`).

## Agenda (Schedule-X)

- **Excluir agendamento pelo toggle**: `appointment-quick-actions.tsx` ganhou prop `onDelete` + botão "Excluir da agenda" (destrutivo) com `ConfirmDialog`. O toggle baixa de `z-[9999]` para `z-[80]` enquanto a confirmação (portal `z-[100]`) está aberta. Reaproveita `deleteAppointment` e o endpoint `DELETE /api/agenda/appointments/[id]`.
- **Sobreposição de dois modais corrigida**: removido o `createEventModalPlugin` — ele abria um segundo card de detalhes no mesmo clique do quick-actions. Agora **hover = detalhe** (tooltip nativo `title`, populado por `MutationObserver` sobre `[data-event-id]`) e **clique/toque = ações** (quick-actions).
- **View mobile = Dia**: em `<=640px` a `defaultView` do Schedule-X passa a `"day"` (semana com 7 colunas ficava ilegível). Detecção única via `matchMedia` no init de `useState`.

## Mobile — correções de responsividade

- **Drawer mobile via portal**: `mobile-nav-drawer.tsx` passou a renderizar o overlay com `createPortal(document.body)` em `z-[100]`. Antes ficava preso atrás do banner da agenda (`sticky z-30`) porque o `backdrop-blur` do header criava stacking context.
- **Mapa de Campos paginado** (`FieldNavigator` em `desktop-anamnesis-editor.tsx`): lista de campos paginada de 8 em 8 (`FIELD_NAV_PAGE_SIZE`), com controles Ant/Próx e indicador `n/total`. **Troca automática** de página quando o campo ativo muda (ao concluir um campo e avançar). Equivalência total preservada (clique = `onJump`, indicadores ✓/!/tipo, cabeçalho "Página N" do PDF).

## Schema

- [x] **Migration aplicada**: `supabase/migrations/20260525120000_photos_evolution_submission_link.sql` — coluna `clinic.photos.evolution_submission_id` (FK → `evolution_submissions`, `ON DELETE SET NULL`) + índice composto.
- Decisão consciente: PDF da evolução **não** embute as fotos; vínculo no DB substitui o pipeline de PDF compose (mais simples, sem mudar gerador).
- `lib/supabase/database.types.ts` já tinha a coluna nos tipos.

## Versionamento / Docker

- `package.json`: `1.0.0` → `1.0.4`.
- `Dockerfile` e `docker-compose.yml`: imagem `hygorfragas/clinica:1.0.4`.
- Regra de versionamento Docker formalizada em `.cursor/rules/10-docker-image-versioning.mdc` (sempre publicar primeiro com tag semver; `latest` é alias opcional).

## ⚠️ Para colocar em produção (release 1.0.4)

1. ~~Aplicar a migration `20260525120000_photos_evolution_submission_link.sql` no Supabase~~ ✅ **Feito** (2026-06-08).
2. Buildar e publicar imagem Docker:
   - `docker build -t hygorfragas/clinica:1.0.4 .`
   - `docker push hygorfragas/clinica:1.0.4`
3. Atualizar a stack no Portainer pra `hygorfragas/clinica:1.0.4`.
4. Testar no iPad: drawer mobile, modo guiado (valores visíveis), upload de foto na evolução (câmera + galeria), Antes/Depois.

---

# Release 1.0.5 — Fotos no interativo, login 50/50, PDF interativo (2026-06-08)

## Fotos no modo interativo (evolução)

- Novo wrapper `components/evolutions/evolucao-interactive-editor.tsx` conecta `EvolutionPhotoSidePanel` via `extraSidePanel` na rota `/evolucao/interativa/...`.
- Upload câmera/galeria, Antes/Depois e filtro por sessão disponíveis no drawer mobile e painel lateral desktop.

## Login / cadastro 50/50

- Novo `components/auth/auth-split-layout.tsx`: grid 50/50 com formulário + vídeo vertical em loop (`public/media/login-loop.mp4`).
- Mobile portrait: metade superior formulário, metade inferior vídeo (`grid-rows` 50/50).
- Desktop: colunas lado a lado. Overlay de sombra no vídeo; fallback em gradiente se o arquivo não existir.

## PDF interativo — bug e melhorias

**Causa raiz confirmada (código):**
1. `touchAction: "none"` no wrapper do PDF bloqueava scroll vertical ao tocar no documento em tablets — parte inferior de PDFs altos ficava inacessível.
2. `getViewport` sem `rotation: page.rotate` podia distorcer/cortar PDFs com rotação atípica.

**Correções:**
- Removido `touchAction: "none"` do wrapper; scroll `pan-y` restaurado no viewer.
- `pdf-page-canvas.tsx` passa `rotation` ao `getViewport`.
- Pinch-zoom (2 dedos, 0.5x–3x) e pan com 1 dedo quando zoom > 1 e dedo/mouse OFF.
- Botão **Travar** na toolbar congela zoom/posição; desenho com Apple Pencil continua.
- Hook `lib/anamnesis/use-pinch-pan.ts`; transform reset ao trocar de página.

---

# Release 1.0.6 — Biblioteca de fotos + PDF interativo (2026-06-27)

## Biblioteca de fotos na ficha

- Aba **Fotos** ao lado de **Anexos**; galeria unificada (`clinic.photos`).
- Upload com data/hora (`captured_at`), validação de assinatura binária, `ClinicDateTimePicker`.
- Imagem Docker: `hygorfragas/clinica:1.0.6` (`linux/amd64`).

## Débito / melhoria registrada

- **Performance da biblioteca:** grid carrega URL signed do original → aba do browser ~2 GB RAM com muitas fotos. Resolvido na **1.0.8** — ver release abaixo.

---

# Release 1.0.8 — Otimização da biblioteca de fotos (2026-06-29)

> **Nota:** a tag `1.0.7` foi publicada por engano e **não deve ser usada** (conflito com release existente). Use `1.0.8`.

## Upload

- Toggle pill para envio (data/hora → seleção → enviar).
- Lote até **400 MB** total (sem teto por arquivo na biblioteca).
- Envio **1 a 1** com card de progresso animado (`motion`).
- Miniatura WebP gerada no upload (`sharp`).

## Galeria

- SSR só com metadados (sem N signed URLs do original).
- Grid via `GET /api/clinical/photos/[id]/thumb`.
- Lightbox carrega original sob demanda (`getClinicalPhotoFullUrl`).
- Fotos legadas sem thumb: proxy on-the-fly com cache HTTP.

## Infra

- Imagem Docker: `hygorfragas/clinica:1.0.8` (`linux/amd64`).
- Dockerfile: `vips` para `sharp` no runner.

---

# Release 1.0.9 — Fix upload de fotos > 10 MB (2026-06-29)

## Correção

- `middlewareClientMaxBodySize: 400mb` em `next.config.ts` — o middleware truncava o body em 10 MB antes da Server Action, causando `Unexpected end of form` em fotos de iPhone.

## Infra

- Imagem Docker: `hygorfragas/clinica:1.0.9` (`linux/amd64`).

---

# Release 1.1.0 — Biblioteca de fotos: paginação, filtro e lightbox (2026-06-29)

## Biblioteca de fotos

- **Paginação:** 24 fotos por página com navegação Anterior/Próxima.
- **Filtro por data** (de/até) pela data de captura ou envio.
- **Lightbox:** original via `GET /api/clinical/photos/[id]/full` (corrige 404 da Server Action em produção).

## Infra

- Imagem Docker: `hygorfragas/clinica:1.1.0` (`linux/amd64`).

---

# Release 1.1.1 — Fix PDF interativo + upload de fotos (2026-07-04)

## PDF interativo

- Miniaturas: cancelamento de render, fila com máx. 2 concorrentes, raster só nas páginas ativas ±2.
- Memória: cache principal reduzido; sem `ImageBitmap` durante gestos.
- Gestos: `stopPropagation` no pinch/pan; desenho bloqueado com zoom ≠ 1.
- `error.tsx` nas rotas interativas (anamnese, evolução, contratos).

## Upload de fotos

- Novo `POST /api/clinical/photos/upload` (evita crash da rota com Server Action).
- Lógica extraída para `lib/clinical/library-photo-upload.ts`.
- Datas inválidas na galeria não derrubam o grid.

## Infra

- Imagem Docker: `hygorfragas/clinica:1.1.1` (`linux/amd64`).

---

# Release 1.1.2 — CRUD de produtos, BOM e baixa de estoque (2026-08-01)

## Estoque / Produtos

- CRUD completo de produtos: criar, editar, ajustar estoque e excluir/restaurar (soft-delete via `is_archived`, UI como Excluir).
- BOM de insumos por procedimento (`clinic.procedure_bom_items`) com override pontual na baixa.
- Botão **Baixar estoque** no dialog do agendamento; RPC atômica `consume_appointment_stock` (sem parcial e sem race de consumo duplicado).

## Correções relacionadas

- `taken_at` da biblioteca de fotos usa data civil no fuso da clínica.
- `ClinicDateTimePicker` trata o valor como horário civil da clínica.
- Miniaturas clínicas com `Cache-Control: private`.

## Infra

- Imagem Docker: `hygorfragas/clinica:1.1.2` (`linux/amd64`).
- Migrações: `20260801120000_procedure_bom_items.sql`, `20260801123000_consume_appointment_stock_atomic.sql`.

---

# Release 1.1.3 — Edição de orçamentos (2026-08-19)

## Orçamentos

- Edição inline de orçamentos em **Rascunho** ou **Enviado** (título, validade, desconto e itens).
- RPC atômica `clinic.update_budget` com `FOR UPDATE`, bloqueio após lançamento financeiro.

## Infra

- Imagem Docker: `hygorfragas/clinica:1.1.3` (`linux/amd64`).
- Migração: `20260819120000_update_budget_atomic.sql`.

---

# Release 1.1.4 — Múltiplos procedimentos na Agenda (2026-08-19)

## Agenda

- Múltiplos procedimentos por agendamento (`clinic.appointment_procedures`), lista no dialog e exibição no calendário/banner/ficha.
- RPC `clinic.set_appointment_procedures` (replace-all atômico); update aplica procedimentos antes do patch com rollback.
- Baixa de estoque com BOM agregado de todos os procedimentos do atendimento.

## Infra

- Imagem Docker: `hygorfragas/clinica:1.1.4` (`linux/amd64`).
- Migração: `20260819130000_appointment_procedures.sql`.
