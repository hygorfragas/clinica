# Frontend e design system

<!-- specsfy:documentator:start -->
## Superfícies observadas

- Componentes, páginas ou views: 159.
- Tailwind: detectado.
- Tokens CSS: --canvas, --surface, --muted, --foreground, --foreground-muted, --foreground-subtle, --border, --destructive, --shadow-lift, --shadow-sidebar, --shadow-card-bento, --shadow-panel, --radius-lg, --radius-md, --radius-sm, --font-sans, --brand, --brand-hover, --brand-soft, --brand-container, --secondary-container, --on-secondary-container, --ring.

| Arquivo |
| --- |
| app/(auth)/cadastro/cadastro-form.tsx |
| app/(auth)/cadastro/page.tsx |
| app/(auth)/layout.tsx |
| app/(auth)/login/login-form.tsx |
| app/(auth)/login/page.tsx |
| app/(dashboard)/agenda/loading.tsx |
| app/(dashboard)/agenda/page.tsx |
| app/(dashboard)/configuracoes/agenda/page.tsx |
| app/(dashboard)/configuracoes/anamnese/[templateId]/page.tsx |
| app/(dashboard)/configuracoes/anamnese/page.tsx |
| app/(dashboard)/configuracoes/aparencia/page.tsx |
| app/(dashboard)/configuracoes/contratos/[templateId]/campos/page.tsx |
| app/(dashboard)/configuracoes/contratos/page.tsx |
| app/(dashboard)/configuracoes/documentos/page.tsx |
| app/(dashboard)/configuracoes/evolucao/[templateId]/page.tsx |
| app/(dashboard)/configuracoes/evolucao/page.tsx |
| app/(dashboard)/configuracoes/layout.tsx |
| app/(dashboard)/configuracoes/loading.tsx |
| app/(dashboard)/configuracoes/perfil/page.tsx |
| app/(dashboard)/configuracoes/profissional/page.tsx |
| app/(dashboard)/equipe/layout.tsx |
| app/(dashboard)/equipe/page.tsx |
| app/(dashboard)/error.tsx |
| app/(dashboard)/estoque/page.tsx |
| app/(dashboard)/financeiro/categorias/page.tsx |
| app/(dashboard)/financeiro/contas/page.tsx |
| app/(dashboard)/financeiro/lancamentos/page.tsx |
| app/(dashboard)/financeiro/layout.tsx |
| app/(dashboard)/financeiro/page.tsx |
| app/(dashboard)/financeiro/relatorios/page.tsx |
| app/(dashboard)/inicio/page.tsx |
| app/(dashboard)/layout.tsx |
| app/(dashboard)/loading.tsx |
| app/(dashboard)/orcamentos/loading.tsx |
| app/(dashboard)/orcamentos/page.tsx |
| app/(dashboard)/pacientes/[clientId]/anamnese/page.tsx |
| app/(dashboard)/pacientes/[clientId]/anexos/page.tsx |
| app/(dashboard)/pacientes/[clientId]/contratos/page.tsx |
| app/(dashboard)/pacientes/[clientId]/documentos/page.tsx |
| app/(dashboard)/pacientes/[clientId]/evolucao/page.tsx |
| app/(dashboard)/pacientes/[clientId]/financeiro/page.tsx |
| app/(dashboard)/pacientes/[clientId]/fotos/page.tsx |
| app/(dashboard)/pacientes/[clientId]/historico/page.tsx |
| app/(dashboard)/pacientes/[clientId]/layout.tsx |
| app/(dashboard)/pacientes/[clientId]/loading.tsx |
| app/(dashboard)/pacientes/[clientId]/not-found.tsx |
| app/(dashboard)/pacientes/[clientId]/page.tsx |
| app/(dashboard)/pacientes/loading.tsx |
| app/(dashboard)/pacientes/novo/page.tsx |
| app/(dashboard)/pacientes/page.tsx |
| app/(dashboard)/plataforma/layout.tsx |
| app/(dashboard)/plataforma/loading.tsx |
| app/(dashboard)/plataforma/page.tsx |
| app/(dashboard)/plataforma/usuarios/page.tsx |
| app/(dashboard)/template.tsx |
| app/(dashboard)/vendas/loading.tsx |
| app/(dashboard)/vendas/nova/page.tsx |
| app/(dashboard)/vendas/page.tsx |
| app/aguardando-acesso/page.tsx |
| app/anamnese/interativa/[clientId]/[submissionId]/layout.tsx |
| app/anamnese/interativa/[clientId]/[submissionId]/page.tsx |
| app/anamnese/interativa/error.tsx |
| app/auth/callback/page.tsx |
| app/contratos/interativa/[clientId]/[submissionId]/page.tsx |
| app/contratos/interativa/error.tsx |
| app/evolucao/interativa/[clientId]/[submissionId]/page.tsx |
| app/evolucao/interativa/error.tsx |
| app/global-error.tsx |
| app/globals.css |
| app/layout.tsx |
| app/page.tsx |
| components/agenda/agenda-calendar.tsx |
| components/agenda/agenda-notifications-provider.tsx |
| components/agenda/appointment-dialog.tsx |
| components/agenda/appointment-quick-actions.tsx |
| components/agenda/appointment-stock-consume.tsx |
| components/agenda/google-calendar-nudge.tsx |
| components/agenda/next-appointment-banner.tsx |
| components/anamnesis/anamnesis-submissions-panel.tsx |
| components/anamnesis/desktop-anamnesis-editor.tsx |
| components/anamnesis/ink-layer-error-boundary.tsx |
| components/anamnesis/ink-layer.tsx |
| components/anamnesis/interactive-anamnesis-editor.tsx |
| components/anamnesis/interactive-route-error.tsx |
| components/anamnesis/interactive-toolbar.tsx |
| components/anamnesis/page-thumbnails.tsx |
| components/anamnesis/pdf-page-canvas.tsx |
| components/anamnesis/signature-pad-modal.tsx |
| components/anamnesis/template-field-designer.tsx |
| components/anamnesis/templates-manager.tsx |
| components/auth/auth-split-layout.tsx |
| components/auth/supabase-hash-session-handler.tsx |
| components/budgets/budgets-manager.tsx |
| components/clients/clinical-photo-uploader.tsx |
| components/clients/face-puppet-guide.tsx |
| components/clients/novo-paciente-wizard.tsx |
| components/clients/paciente-anamnese-form.tsx |
| components/clients/paciente-cadastro-form.tsx |
| components/clients/paciente-dados-editor.tsx |
| components/clients/paciente-documentos-panel.tsx |
| components/clients/paciente-evolucao-panel.tsx |
| components/clients/paciente-ficha-nav.tsx |
| components/clients/paciente-foto-library-uploader.tsx |
| components/clients/paciente-fotos-biblioteca.tsx |
| components/clients/paciente-historico-compras-panel.tsx |
| components/clients/paciente-historico-panel.tsx |
| components/clients/paciente-ocultar-da-lista-button.tsx |
| components/clients/pacientes-lista.tsx |
| components/clients/patient-search-dialog.tsx |
| components/clients/photo-upload-progress-card.tsx |
| components/clinic/stat-card.tsx |
| components/configuracoes/agenda-config-panel.tsx |
| components/configuracoes/configuracoes-subnav.tsx |
| components/configuracoes/contract-templates-manager.tsx |
| components/configuracoes/document-branding-manager.tsx |
| components/configuracoes/document-preview-a4.tsx |
| components/configuracoes/professional-assets-form.tsx |
| components/contracts/contract-html-preview.tsx |
| components/contracts/contract-rich-editor.tsx |
| components/equipe/invite-agent-form.tsx |
| components/evolutions/evolucao-interactive-editor.tsx |
| components/evolutions/evolution-photo-side-panel.tsx |
| components/evolutions/evolution-templates-manager.tsx |
| components/financeiro/categorias-panel.tsx |
| components/financeiro/contas-panel.tsx |
| components/financeiro/financeiro-subnav.tsx |
| components/financeiro/lancamentos-panel.tsx |
| components/financeiro/relatorios-panel.tsx |
| components/financeiro/visao-geral-panel.tsx |
| components/layout/app-shell.tsx |
| components/layout/clinic-nav.tsx |
| components/layout/mobile-nav-drawer.tsx |
| components/layout/sign-out-button.tsx |
| components/plataforma/create-clinic-form.tsx |
| components/plataforma/platform-clinics-panel.tsx |
| components/plataforma/platform-users-panel.tsx |
| components/providers/query-provider.tsx |
| components/sales/new-sale-wizard.tsx |
| components/sales/sales-chart.tsx |
| components/setup/cadastro-migration-required.tsx |
| components/setup/missing-supabase-env-card.tsx |
| components/stock/procedures-panel.tsx |
| components/stock/products-panel.tsx |
| components/stock/stock-tabs.tsx |
| components/theme/clinic-appearance-panel.tsx |
| components/theme/profile-theme-panel.tsx |
| components/theme/theme-init-script.tsx |
| components/theme/theme-pickers.tsx |
| components/theme/theme-provider.tsx |
| components/ui/button.tsx |
| components/ui/card.tsx |
| components/ui/clinic-datetime-picker.tsx |
| components/ui/confirm-dialog.tsx |
| components/ui/digital-signature-pad.tsx |
| components/ui/input.tsx |
| components/ui/label.tsx |
| components/ui/skeleton.tsx |
| components/ui/toaster.tsx |
| tailwind.config.ts |
<!-- specsfy:documentator:end -->

## Complemento auditado

O mapa canônico de primitives, blocos e telas está em `INTERFACE.md`. A UI usa
DM Sans, tokens semânticos e tema por clínica/usuário. `components/ui/` contém
primitives próprias; não há `components.json` nem registry shadcn/ReUI
configurado. Portanto, catálogo instalado como skill não é componente do
produto e não deve ser importado diretamente.

Páginas e layouts permanecem server-first; calendário, formulários, editores
PDF/canvas, upload, dialogs e navegação mobile são Client Components. Estados
de loading, vazio, erro, sucesso, permissão e not-found devem continuar
explícitos em desktop, tablet e mobile.
