# Interface do projeto

Este arquivo é a fonte canônica para construir e reaproveitar a interface.
Atualize-o antes e depois de cada tarefa que criar ou mudar uma tela React.

## Base observada

- Stack: Next.js 15 App Router, React 19 e Tailwind CSS 3.
- Fronteira: páginas e layouts são Server Components por padrão; interação,
  formulários, canvas, diálogo e estado local ficam em componentes folha com
  `"use client"`.
- Formulários: React Hook Form + Zod; entradas de Server Actions e APIs também
  são validadas no servidor.
- Dados: Server Components, Server Actions e TanStack Query. Zustand consta na
  stack desejada, mas não está instalado no manifest atual.
- Política: toda interface React é composta por componentes React.
- Primitives atuais: componentes próprios em `components/ui/`, com
  `class-variance-authority`, sem `components.json` ou registry shadcn
  configurado no estado observado.
- Política para novas primitives: shadcn/ui, depois de inicializar e auditar o
  registry sem substituir customizações locais.
- Política para novas composições: ReUI gratuito (`@reui/c-*`) somente após
  compatibilidade explícita com a stack atual; o projeto usa Tailwind 3 e não
  possui registry ReUI configurado.
- Testes de interface automatizados: não identificados pelo inspetor; a base
  atual depende de typecheck, build e validação manual dos estados.

## Design system

| Item | Localização ou valor | Uso no projeto |
| --- | --- | --- |
| Tokens e tema | `app/globals.css`, `tailwind.config.ts`, `.interface-design/system.md` | Canvas quente, surfaces, verde-sálvia, estados semânticos, raios e sombras |
| Tipografia | DM Sans em `app/layout.tsx`, variável `--font-sans` | Corpo, navegação, formulários e títulos curtos |
| Tema por tenant/usuário | `components/theme/`, `lib/theme/` | Modo claro/escuro e acento por clínica ou preferência individual |
| Configuração shadcn/ui | Não encontrada (`components.json` ausente) | Antes de instalar uma primitive, inicializar com os aliases atuais e revisar o diff |
| Registry ReUI | Não configurado | Usar apenas itens gratuitos compatíveis depois de confirmar a versão de Tailwind |
| Primitives compartilhadas | `components/ui/` | Button, Card, Input, Label, Skeleton, Toaster, confirmação, data/hora e assinatura |
| Shell e navegação | `components/layout/` | Sidebar desktop, drawer mobile, navegação por papel e encerramento de sessão |
| Composições de domínio | `components/{agenda,anamnesis,budgets,clients,configuracoes,contracts,equipe,evolutions,financeiro,plataforma,sales,stock}/` | Fluxos operacionais e CRUDs da clínica |

## Blocos criados e reaproveitáveis

Registre todos os blocos criados no projeto, inclusive os internos de uma
feature. Um bloco é um componente React com responsabilidade própria, como
grade, formulário, filtro, cabeçalho, cartão, diálogo, painel lateral, estado
vazio, upload ou ação em lote.

| Bloco | Tipo | Arquivo | Origem | Finalidade e API pública | Estados e acessibilidade | Consumidores | Reaproveitar ou estender |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Button | Primitive | `components/ui/button.tsx` | Próprio, com CVA | Ações e links com variantes visuais | Foco visível, disabled e variantes semânticas | Toda a aplicação | Estender variantes antes de criar outro botão-base |
| Card | Primitive | `components/ui/card.tsx` | Próprio | Superfície de conteúdo e agrupamento | Conteúdo longo e responsivo | Dashboard, formulários e painéis | Reusar como superfície padrão |
| Input e Label | Primitives | `components/ui/input.tsx`, `components/ui/label.tsx` | Próprio | Campos textuais e rótulos | Disabled, erro via composição e associação de label | Formulários da aplicação | Reusar com RHF e schemas Zod |
| Feedback global | Primitive | `components/ui/toaster.tsx`, `lib/ui/notify.ts` | Sonner + wrapper próprio | Sucesso, erro, informação, aviso e promessa | Região de anúncio do toaster | Mutations client-side | Usar helpers de `notify` em vez de chamadas dispersas |
| ConfirmDialog | Composição | `components/ui/confirm-dialog.tsx` | Próprio | Confirmar ações destrutivas ou irreversíveis | Portal, foco, Escape e retorno ao trigger | Agenda e demais exclusões | Estender antes de criar novo modal de confirmação |
| ClinicDateTimePicker | Composição | `components/ui/clinic-datetime-picker.tsx` | Próprio | Entrada de data/hora civil da clínica | Teclado, validação e mobile | Agenda e fotos | Preservar timezone `America/Sao_Paulo` |
| DigitalSignaturePad | Composição clínica | `components/ui/digital-signature-pad.tsx` | Próprio + Signature Pad | Capturar assinatura em canvas | Pointer/touch, limpar e estado vazio | Documentos e formulários clínicos | Reusar em qualquer assinatura digital |
| AppShell | Layout | `components/layout/app-shell.tsx` | Próprio | Compor sidebar/header/main por variante de acesso | Desktop/mobile, conteúdo rolável | Layout do dashboard | Não duplicar shell em páginas |
| ClinicNav e MobileNavDrawer | Navegação | `components/layout/clinic-nav.tsx`, `components/layout/mobile-nav-drawer.tsx` | Próprio | Menus por papel e drawer responsivo | Rota atual, Escape, backdrop e scroll lock | AppShell | Alterar menus nos dois consumidores de forma coordenada |
| AgendaCalendar | Domínio | `components/agenda/agenda-calendar.tsx` | Próprio + Schedule-X | Calendário, seleção e exibição de agendamentos | Loading, desktop/mobile e interação touch | `/agenda` | Centralizar comportamento de calendário neste bloco |
| AppointmentDialog e ações | Domínio | `components/agenda/appointment-dialog.tsx`, `appointment-quick-actions.tsx`, `appointment-stock-consume.tsx` | Próprio | Criar/editar/excluir agendamento e consumir estoque | Validação, pending, conflito, confirmação e erro | Agenda | Reusar contratos de `lib/agenda/` e `lib/stock/` |
| BudgetsManager | Domínio | `components/budgets/budgets-manager.tsx` | Próprio | Listar, criar e editar orçamentos | Loading, vazio, validação, conflito e erro | `/orcamentos` | Manter escrita via RPC atômica |
| PacientesLista e PatientSearchDialog | Domínio | `components/clients/pacientes-lista.tsx`, `patient-search-dialog.tsx` | Próprio | Buscar, paginar, selecionar e navegar para pacientes | Loading, vazio, filtros e teclado | `/pacientes`, vendas e agenda | Reusar a busca antes de criar seletor paralelo |
| NovoPacienteWizard e editores | Domínio | `components/clients/novo-paciente-wizard.tsx`, `paciente-cadastro-form.tsx`, `paciente-dados-editor.tsx` | Próprio + RHF/Zod | Cadastro mínimo/completo e edição de dados | Etapas, erros por campo, pending e sucesso | `/pacientes/novo`, ficha | Preservar schema e tenant no servidor |
| Ficha da paciente | Navegação e painéis | `components/clients/paciente-ficha-nav.tsx`, `components/clients/paciente-*-panel.tsx` | Próprio | Navegar por dados, histórico, documentos e evolução | Not-found, vazio, loading e erro por aba | `/pacientes/[clientId]/*` | Acrescentar módulos na navegação existente |
| Biblioteca de fotos | Domínio | `components/clients/paciente-fotos-biblioteca.tsx`, `clinical-photo-uploader.tsx`, `photo-upload-progress-card.tsx` | Próprio + Sharp/Motion | Paginar, filtrar, enviar e abrir fotos clínicas | Progresso, erro, lote, lightbox e mobile | Aba Fotos e evolução | Grid usa thumb; original somente sob demanda |
| Editores clínicos | Domínio | `components/anamnesis/desktop-anamnesis-editor.tsx`, `interactive-anamnesis-editor.tsx`, `interactive-toolbar.tsx` | Próprio + PDF.js/canvas | Preencher PDF, tinta, assinatura e modo guiado | Loading, erro recuperável, touch, zoom e teclado | Anamnese e evolução interativas | Reusar por `entityKind`; não clonar editor |
| Templates e submissões | Domínio | `components/anamnesis/templates-manager.tsx`, `anamnesis-submissions-panel.tsx`, `components/evolutions/evolution-templates-manager.tsx` | Próprio | CRUD de templates e ciclo draft/submitted | Vazio, upload, pending, erro e sucesso | Configurações e ficha | Reusar contratos compartilhados dos editores |
| Contratos e branding | Domínio | `components/configuracoes/contract-templates-manager.tsx`, `document-branding-manager.tsx`, `components/contracts/contract-rich-editor.tsx` | Próprio + Tiptap | Editar contratos e identidade de documentos | Upload, preview, validação e erro | Configurações e ficha | Sanitizar HTML e preservar storage privado |
| Financeiro | Família de domínio | `components/financeiro/*.tsx` | Próprio | Visão geral, contas, categorias, lançamentos e relatórios | Permissão, filtros, vazio, loading e erro | `/financeiro/*` | Reusar subnav e schemas financeiros |
| Estoque | Família de domínio | `components/stock/*.tsx` | Próprio | CRUD de produtos/procedimentos, BOM e estoque | Validação, arquivamento, conflito e erro | `/estoque` e agenda | Escritas de consumo permanecem atômicas |
| Plataforma e equipe | Família administrativa | `components/plataforma/*.tsx`, `components/equipe/*.tsx` | Próprio | Gerir clínicas, usuários e agentes | Permission denied, validação, upload e erro | `/plataforma/*`, `/equipe` | Não misturar contexto global e tenant |

## Telas e composição

| Tela ou rota | Arquivo | Componentes React usados | Dados e ações | Estados |
| --- | --- | --- | --- | --- |
| Login e cadastro | `app/(auth)/login/page.tsx`, `app/(auth)/cadastro/page.tsx` | AuthSplitLayout e forms próprios | Supabase Auth, bootstrap do primeiro usuário | Pending, erro, redirect por papel e responsivo 50/50 |
| Início | `app/(dashboard)/inicio/page.tsx` | StatCard e acessos rápidos | Contagens por tenant | Loading do dashboard, vazio e erro do segmento |
| Agenda | `app/(dashboard)/agenda/page.tsx` | AgendaCalendar, banners e dialogs | Agendamentos, procedimentos, Google Calendar e estoque | `loading.tsx`, conflito, sync, vazio e erro |
| Pacientes | `app/(dashboard)/pacientes/page.tsx`, `novo/page.tsx` | PacientesLista e NovoPacienteWizard | Busca, paginação, cadastro e ocultação | Loading, vazio, validação e sucesso |
| Ficha da paciente | `app/(dashboard)/pacientes/[clientId]/*` | PacienteFichaNav e painéis de domínio | Prontuário, anamnese, evolução, fotos, contratos e financeiro | `loading.tsx`, `not-found.tsx`, vazio e erro por módulo |
| Orçamentos e vendas | `app/(dashboard)/orcamentos/page.tsx`, `app/(dashboard)/vendas/*` | BudgetsManager e NewSaleWizard | Orçamento, itens, compra e completude | Loading, validação, conflito e sucesso |
| Estoque | `app/(dashboard)/estoque/page.tsx` | StockTabs, ProductsPanel e ProceduresPanel | Produtos, BOM, movimentos e arquivamento | Loading, vazio, pending e erro |
| Financeiro | `app/(dashboard)/financeiro/*` | FinanceiroSubnav e painéis | Contas, categorias, métodos, transações e relatórios | Guard de clinic_admin, filtros, vazio e erro |
| Configurações | `app/(dashboard)/configuracoes/*` | ConfiguracoesSubnav e managers | Agenda, templates, branding, perfil e aparência | Guard administrativo, loading, upload e erro |
| Equipe | `app/(dashboard)/equipe/*` | InviteAgentForm | Agentes e ativos profissionais | Guard administrativo, validação e erro |
| Plataforma | `app/(dashboard)/plataforma/*` | PlatformClínicsPanel e PlatformUsersPanel | Clínicas, usuários e impersonação | Guard global, loading, permissão e erro |
| Fluxos interativos | `app/{anamnese,evolucao,contratos}/interativa/*` | Editores PDF/HTML e painéis clínicos | Rascunho, assinatura e submissão | Erro recuperável, touch/tablet, pending e sucesso |

## Regras de composição

1. Páginas e rotas coordenam dados e compõem componentes; não concentram a
   grade, formulário, filtros, overlays ou cartões reutilizáveis.
2. Antes de criar um componente, consulte esta tabela e reaproveite o item
   existente quando ele atender à mesma intenção.
3. Todo item instalado de shadcn/ui ou ReUI entra na tabela com seu arquivo,
   origem, explicação, API, estados e consumidores reais.
4. ReUI usa somente itens gratuitos `@reui/c-*`; use shadcn/ui para
   primitives e ReUI para composições de produto.
5. Ao criar um bloco, registre-o nesta tabela na mesma tarefa. Ao alterar ou
   remover um bloco, atualize seus consumidores e a orientação de reuso.
