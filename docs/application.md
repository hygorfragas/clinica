# Aplicação e implementações

<!-- specsfy:documentator:start -->
## Superfícies

Categorias: Serviços, Rotas e APIs, Páginas, Componentes, Testes e Outras fontes.

Relação: relaciona cada arquivo observado à sua superfície.

| Categoria | Arquivo | Símbolos |
| --- | --- | --- |
| Outras fontes | app/(auth)/cadastro/cadastro-form.tsx | CadastroSuperAdminForm, onSubmit |
| Páginas | app/(auth)/cadastro/page.tsx | CadastroPage |
| Outras fontes | app/(auth)/layout.tsx | AuthLayout |
| Outras fontes | app/(auth)/login/login-form.tsx | LoginForm, onSubmit |
| Páginas | app/(auth)/login/page.tsx | LoginPage |
| Outras fontes | app/(dashboard)/agenda/loading.tsx | AgendaLoading |
| Páginas | app/(dashboard)/agenda/page.tsx | AgendaPage |
| Páginas | app/(dashboard)/configuracoes/agenda/page.tsx | ConfiguracoesAgendaPage |
| Páginas | app/(dashboard)/configuracoes/anamnese/[templateId]/page.tsx | EditAnamnesisTemplatePage |
| Páginas | app/(dashboard)/configuracoes/anamnese/page.tsx | ConfiguracoesAnamnesePage |
| Páginas | app/(dashboard)/configuracoes/aparencia/page.tsx | AparenciaPage |
| Páginas | app/(dashboard)/configuracoes/contratos/[templateId]/campos/page.tsx | EditContractTemplateFieldsPage |
| Páginas | app/(dashboard)/configuracoes/contratos/page.tsx | ConfiguracoesContratosPage |
| Páginas | app/(dashboard)/configuracoes/documentos/page.tsx | ConfigDocumentosPage |
| Páginas | app/(dashboard)/configuracoes/evolucao/[templateId]/page.tsx | EditEvolutionTemplatePage |
| Páginas | app/(dashboard)/configuracoes/evolucao/page.tsx | ConfiguracoesEvolucaoPage |
| Outras fontes | app/(dashboard)/configuracoes/layout.tsx | ConfiguracoesLayout |
| Outras fontes | app/(dashboard)/configuracoes/loading.tsx | ConfiguracoesLoading |
| Páginas | app/(dashboard)/configuracoes/perfil/page.tsx | PerfilPage |
| Páginas | app/(dashboard)/configuracoes/profissional/page.tsx | ConfigProfissionalPage |
| Outras fontes | app/(dashboard)/equipe/layout.tsx | EquipeLayout |
| Páginas | app/(dashboard)/equipe/page.tsx | ROLE_LABEL, EquipePage |
| Outras fontes | app/(dashboard)/error.tsx | DashboardError |
| Páginas | app/(dashboard)/estoque/page.tsx | EstoquePage |
| Páginas | app/(dashboard)/financeiro/categorias/page.tsx | FinanceiroCategoriasPage |
| Páginas | app/(dashboard)/financeiro/contas/page.tsx | FinanceiroContasPage |
| Páginas | app/(dashboard)/financeiro/lancamentos/page.tsx | FinanceiroLancamentosPage |
| Outras fontes | app/(dashboard)/financeiro/layout.tsx | FinanceiroLayout |
| Páginas | app/(dashboard)/financeiro/page.tsx | FinanceiroVisaoGeralPage |
| Páginas | app/(dashboard)/financeiro/relatorios/page.tsx | FinanceiroRelatoriosPage |
| Páginas | app/(dashboard)/inicio/page.tsx | InicioPage |
| Outras fontes | app/(dashboard)/layout.tsx | DashboardLayout |
| Outras fontes | app/(dashboard)/loading.tsx | DashboardLoading |
| Outras fontes | app/(dashboard)/orcamentos/loading.tsx | OrcamentosLoading |
| Páginas | app/(dashboard)/orcamentos/page.tsx | OrcamentosPage |
| Páginas | app/(dashboard)/pacientes/[clientId]/anamnese/page.tsx | PacienteAnamnesePage |
| Páginas | app/(dashboard)/pacientes/[clientId]/anexos/page.tsx | PacienteAnexosPage |
| Páginas | app/(dashboard)/pacientes/[clientId]/contratos/page.tsx | PacienteContratosPage |
| Páginas | app/(dashboard)/pacientes/[clientId]/documentos/page.tsx | LegacyDocumentosRedirect |
| Páginas | app/(dashboard)/pacientes/[clientId]/evolucao/page.tsx | PacienteEvolucaoPage |
| Páginas | app/(dashboard)/pacientes/[clientId]/financeiro/page.tsx | BRL, PacienteFinanceiroPage |
| Páginas | app/(dashboard)/pacientes/[clientId]/fotos/page.tsx | PacienteFotosPage |
| Páginas | app/(dashboard)/pacientes/[clientId]/historico/page.tsx | PacienteHistoricoPage |
| Outras fontes | app/(dashboard)/pacientes/[clientId]/layout.tsx | PacienteFichaLayout |
| Outras fontes | app/(dashboard)/pacientes/[clientId]/loading.tsx | PacienteDetalheLoading |
| Outras fontes | app/(dashboard)/pacientes/[clientId]/not-found.tsx | PacienteNotFound |
| Páginas | app/(dashboard)/pacientes/[clientId]/page.tsx | BRL, PacienteResumoPage, StatCard, statusLabel |
| Outras fontes | app/(dashboard)/pacientes/loading.tsx | PacientesLoading |
| Páginas | app/(dashboard)/pacientes/novo/page.tsx | NovoPacientePage |
| Páginas | app/(dashboard)/pacientes/page.tsx | PacientesPage |
| Outras fontes | app/(dashboard)/plataforma/layout.tsx | PlataformaLayout |
| Outras fontes | app/(dashboard)/plataforma/loading.tsx | PlataformaLoading |
| Páginas | app/(dashboard)/plataforma/page.tsx | PlataformaPage |
| Páginas | app/(dashboard)/plataforma/usuarios/page.tsx | PlataformaUsuariosPage |
| Outras fontes | app/(dashboard)/template.tsx | DashboardTemplate |
| Outras fontes | app/(dashboard)/vendas/loading.tsx | VendasLoading |
| Páginas | app/(dashboard)/vendas/nova/page.tsx | NovaVendaPage |
| Páginas | app/(dashboard)/vendas/page.tsx | BRL, VendasPage, Stat |
| Páginas | app/aguardando-acesso/page.tsx | AguardandoAcessoPage |
| Outras fontes | app/anamnese/interativa/[clientId]/[submissionId]/layout.tsx | AnamneseInterativaLayout |
| Páginas | app/anamnese/interativa/[clientId]/[submissionId]/page.tsx | AnamneseInterativaPage |
| Outras fontes | app/anamnese/interativa/error.tsx | — |
| Rotas e APIs | app/api/agenda/appointments/[id]/route.ts | PATCH, DELETE |
| Rotas e APIs | app/api/agenda/appointments/route.ts | GET, POST |
| Rotas e APIs | app/api/agenda/google/callback/route.ts | redirectWith, GET |
| Rotas e APIs | app/api/agenda/google/connect/route.ts | GET |
| Rotas e APIs | app/api/agenda/google/disconnect/route.ts | POST |
| Rotas e APIs | app/api/agenda/google/settings/route.ts | PATCH |
| Rotas e APIs | app/api/agenda/google/sync/route.ts | POST |
| Rotas e APIs | app/api/agenda/google/test/route.ts | GET |
| Rotas e APIs | app/api/clinica/equipe/agentes/route.ts | optionalFile, POST, assertStampFile, assertSignaturePng |
| Rotas e APIs | app/api/clinical/photos/[photoId]/full/route.ts | GET |
| Rotas e APIs | app/api/clinical/photos/[photoId]/thumb/route.ts | parseWidth, GET |
| Rotas e APIs | app/api/clinical/photos/upload/route.ts | revalidatePaciente, POST |
| Rotas e APIs | app/api/plataforma/clinicas/route.ts | POST, GET |
| Rotas e APIs | app/api/plataforma/entrar-como/route.ts | POST |
| Rotas e APIs | app/api/plataforma/usuarios/route.ts | GET, POST, PATCH, PUT |
| Rotas e APIs | app/api/vendas/completeness/route.ts | POST |
| Páginas | app/auth/callback/page.tsx | OTP_TYPES, safeNext, CallbackContent, run, AuthCallbackPage |
| Páginas | app/contratos/interativa/[clientId]/[submissionId]/page.tsx | ContratoInterativoPage |
| Outras fontes | app/contratos/interativa/error.tsx | — |
| Páginas | app/evolucao/interativa/[clientId]/[submissionId]/page.tsx | EvolucaoInterativaPage |
| Outras fontes | app/evolucao/interativa/error.tsx | — |
| Outras fontes | app/global-error.tsx | GlobalError |
| Outras fontes | app/globals.css | — |
| Outras fontes | app/layout.tsx | RootLayout |
| Páginas | app/page.tsx | HomePage |
| Outras fontes | components/agenda/agenda-calendar.tsx | appointmentToEvent, AgendaCalendar, triggerGoogleSync, onCreate, onUpdate, onDelete |
| Outras fontes | components/agenda/agenda-notifications-provider.tsx | AgendaNotificationsContext, LOOKAHEAD_HOURS, POLL_INTERVAL_MS, ALERT_WINDOW_T15_MS, ALERT_WINDOW_T0_MS, DEDUPE_STORAGE_KEY, dedupeKey, readDedupeSet |
| Outras fontes | components/agenda/appointment-dialog.tsx | toInputValue, fromInputValue, makeRow, sumDurationMinutes, applyDurationToEndsAt, AppointmentDialog, updateProcedureRows, addProcedureRow |
| Outras fontes | components/agenda/appointment-quick-actions.tsx | STATUS_BUTTONS, toInputValue, fromInputValue, AppointmentQuickActions, applyStatus, handleDeleteConfirmed |
| Outras fontes | components/agenda/appointment-stock-consume.tsx | sameIds, AppointmentStockConsume |
| Outras fontes | components/agenda/google-calendar-nudge.tsx | GoogleCalendarNudge |
| Outras fontes | components/agenda/next-appointment-banner.tsx | DISMISS_STORAGE_KEY, DISMISS_WINDOW_MS, describeAppointment, formatCountdown, formatTime, NextAppointmentBanner |
| Outras fontes | components/anamnesis/anamnesis-submissions-panel.tsx | COPY_BY_KIND, AnamnesisSubmissionsPanel, removeSubmission, openChoose, chooseDesktop, chooseInteractive, ModeChooserOverlay, ModeCard |
| Outras fontes | components/anamnesis/desktop-anamnesis-editor.tsx | pdfBaseKey, DesktopAnamnesisEditor, gotoPage, gotoIndex, gotoNext, gotoPrev, doSave, onSaveClick |
| Outras fontes | components/anamnesis/ink-layer-error-boundary.tsx | InkLayerErrorBoundary |
| Outras fontes | components/anamnesis/ink-layer.tsx | isLikelyStylusPointer, InkLayer, StrokeShape, findStrokeAtPoint |
| Outras fontes | components/anamnesis/interactive-anamnesis-editor.tsx | InkLayer, FINGER_PREF_KEY, pdfBaseKey, InteractiveAnamnesisEditor, doSave, onSaveClick, onFinalize |
| Outras fontes | components/anamnesis/interactive-route-error.tsx | InteractiveRouteError |
| Outras fontes | components/anamnesis/interactive-toolbar.tsx | DEFAULT_COLORS, PEN_THICKNESSES, HIGHLIGHTER_THICKNESSES, InteractiveToolbar, ToolPill, IconButton |
| Outras fontes | components/anamnesis/page-thumbnails.tsx | THUMB_RENDER_RADIUS, PageThumbnails, ThumbItem |
| Outras fontes | components/anamnesis/pdf-page-canvas.tsx | paintCached, PdfPageCanvas, render, MAX_CANVAS_SIDE, MAX_CANVAS_AREA |
| Outras fontes | components/anamnesis/signature-pad-modal.tsx | InkLayer, DEFAULT_COLOR, DEFAULT_PEN, SignaturePadModal, handleUndo, handleClear, handleConfirm |
| Outras fontes | components/anamnesis/template-field-designer.tsx | TYPE_META, BIND_PRESETS, TemplateFieldDesigner, gotoPage, handlePointerDownOnPage, onMove, onUp, autoDetectFontSizeForField |
| Outras fontes | components/anamnesis/templates-manager.tsx | TemplatesManager, handleCreate, setDefault, remove |
| Outras fontes | components/auth/auth-split-layout.tsx | VIDEO_SRC, VIDEO_PLAYBACK_RATE, AuthSplitLayout |
| Outras fontes | components/auth/supabase-hash-session-handler.tsx | SupabaseHashSessionHandler |
| Outras fontes | components/budgets/budgets-manager.tsx | BRL, statusClasses, statusLabel, moneyToCents, centsToInput, canEditBudget, budgetToDraftItems, makeItem |
| Outras fontes | components/clients/clinical-photo-uploader.tsx | newKey, ClinicalPhotoUploader, onPickFiles, clearRows, submit |
| Outras fontes | components/clients/face-puppet-guide.tsx | REF1, REF2, FacePuppetGuide |
| Outras fontes | components/clients/novo-paciente-wizard.tsx | templateIsFile, NovoPacienteWizard, uploadDocOptional |
| Outras fontes | components/clients/paciente-anamnese-form.tsx | payloadToForm, PacienteAnamneseForm, onSubmit |
| Outras fontes | components/clients/paciente-cadastro-form.tsx | PacienteCadastroForm, onSubmit |
| Outras fontes | components/clients/paciente-dados-editor.tsx | PacienteDadosEditor, onSubmit |
| Outras fontes | components/clients/paciente-documentos-panel.tsx | PacienteDocumentosPanel, uploadDoc, openDoc, removeDoc |
| Outras fontes | components/clients/paciente-evolucao-panel.tsx | PacienteEvolucaoPanel, onSubmit, onRemove, EvolutionItem, onAttachPhoto |
| Outras fontes | components/clients/paciente-ficha-nav.tsx | PacienteFichaNav |
| Outras fontes | components/clients/paciente-foto-library-uploader.tsx | formatMegabytes, totalBytes, uploadLibraryPhotoViaApi, PacienteFotoLibraryUploader, onBeforeUnload, useToday, onFilesChange, submit |
| Outras fontes | components/clients/paciente-fotos-biblioteca.tsx | PAGE_SIZE, thumbUrl, fetchPhotoFullUrl, PacienteFotosBiblioteca, requestDelete |
| Outras fontes | components/clients/paciente-historico-compras-panel.tsx | formatBRL, PacienteHistoricoComprasPanel, submitRegister |
| Outras fontes | components/clients/paciente-historico-panel.tsx | SECTION_KEYS, NUMERIC_SECTIONS, DATE_FMT, PacienteHistoricoPanel, toggleSection, applyCompletePreset, handleSubmit, openPrevious |
| Outras fontes | components/clients/paciente-ocultar-da-lista-button.tsx | PacienteOcultarDaListaButton, onClick |
| Outras fontes | components/clients/pacientes-lista.tsx | PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE, PAGE_SIZE_STORAGE_KEY, normalizeSearch, isValidPageSize, PacientesLista, PaginationBar, PageButton |
| Outras fontes | components/clients/patient-search-dialog.tsx | bySearchScore, PatientSearchDialog, onEscape, choose |
| Outras fontes | components/clients/photo-upload-progress-card.tsx | PhotoUploadProgressCard |
| Outras fontes | components/clinic/stat-card.tsx | StatCard |
| Outras fontes | components/configuracoes/agenda-config-panel.tsx | WEEK_DAYS, AgendaConfigPanel, toggleDay, save, disconnect, runSync, runDiagnostics |
| Outras fontes | components/configuracoes/configuracoes-subnav.tsx | ConfiguracoesSubnav |
| Outras fontes | components/configuracoes/contract-templates-manager.tsx | ContractTemplatesManager, openEdit, closeModals |
| Outras fontes | components/configuracoes/document-branding-manager.tsx | emptyDraft, draftFromProfile, DocumentBrandingManager, updateDraft, notifyOk, notifyErr, selectProfile, startNewProfile |
| Outras fontes | components/configuracoes/document-preview-a4.tsx | A4_WIDTH_MM, A4_HEIGHT_MM, DocumentPreviewA4 |
| Outras fontes | components/configuracoes/professional-assets-form.tsx | ProfessionalAssetsForm, uploadStamp, saveSignature |
| Outras fontes | components/contracts/contract-html-preview.tsx | ContractHtmlPreview |
| Outras fontes | components/contracts/contract-rich-editor.tsx | ContractRichEditor, Btn |
| Outras fontes | components/equipe/invite-agent-form.tsx | InviteAgentForm, onSubmit |
| Outras fontes | components/evolutions/evolucao-interactive-editor.tsx | EvolucaoInteractiveEditor |
| Outras fontes | components/evolutions/evolution-photo-side-panel.tsx | PAGE_SIZE, SWIPE_THRESHOLD_PX, MAX_BATCH, newKey, EvolutionPhotoSidePanel, loadPhotos, goPrev, goNext |
| Outras fontes | components/evolutions/evolution-templates-manager.tsx | EvolutionTemplatesManager, handleCreate, setDefault, remove |
| Outras fontes | components/financeiro/categorias-panel.tsx | emptyDraft, CategoriasPanel, openCreate, openEdit, close, save, archive, CategoryColumn |
| Outras fontes | components/financeiro/contas-panel.tsx | emptyDraft, ContasPanel, openCreate, openEdit, close, save, toggleArchive, remove |
| Outras fontes | components/financeiro/financeiro-subnav.tsx | FinanceiroSubnav |
| Outras fontes | components/financeiro/lancamentos-panel.tsx | todayStr, emptyDraft, LancamentosPanel, applyFilters, clearFilters, openCreate, openEdit, close |
| Outras fontes | components/financeiro/relatorios-panel.tsx | RelatoriosPanel, applyRange, DreColumn, SummaryCard, PendingTable, fmtRange, exportDreCsv, csvSafe |
| Outras fontes | components/financeiro/visao-geral-panel.tsx | VisaoGeralPanel, KpiCard, PendingRow, TrailingChart, CategoryRanking |
| Outras fontes | components/layout/app-shell.tsx | AppShell, SidebarContent, AppShellBody |
| Outras fontes | components/layout/clinic-nav.tsx | ClinicNav, NavItem |
| Outras fontes | components/layout/mobile-nav-drawer.tsx | MobileNavDrawer |
| Outras fontes | components/layout/sign-out-button.tsx | SignOutButton, onSignOut |
| Outras fontes | components/plataforma/create-clinic-form.tsx | CreateClinicForm, onSubmit |
| Outras fontes | components/plataforma/platform-clinics-panel.tsx | fetchClinics, PlatformClinicsPanel, handleCreated, refresh |
| Outras fontes | components/plataforma/platform-users-panel.tsx | fetchPlatformUsers, PlatformUsersPanel, refresh, createUser, updateProfile, loginAs, generateRecovery |
| Outras fontes | components/providers/query-provider.tsx | QueryProvider |
| Outras fontes | components/sales/new-sale-wizard.tsx | BRL, centsToMoneyStr, parseMoneyToCents, NewSaleWizard, onSubmit, Check |
| Outras fontes | components/sales/sales-chart.tsx | BRL, SalesChart |
| Outras fontes | components/setup/cadastro-migration-required.tsx | CadastroMigrationRequired |
| Outras fontes | components/setup/missing-supabase-env-card.tsx | MissingSupabaseEnvCard |
| Outras fontes | components/stock/procedures-panel.tsx | BRL, parseMoneyToCents, centsToMoneyStr, parseNumber, ProceduresPanel, onCreate, ProcedureRowItem, save |
| Outras fontes | components/stock/products-panel.tsx | BRL, parseMoneyToCents, centsToMoneyStr, parseNumber, ProductsPanel, onCreate, ProductRowItem, doAdjust |
| Outras fontes | components/stock/stock-tabs.tsx | StockTabs, TabButton |
| Outras fontes | components/theme/clinic-appearance-panel.tsx | ClinicAppearancePanel, save |
| Outras fontes | components/theme/profile-theme-panel.tsx | ProfileThemePanel, PasswordCard, submit |
| Outras fontes | components/theme/theme-init-script.tsx | ThemeInitScript |
| Outras fontes | components/theme/theme-pickers.tsx | AccentPicker, ModePicker |
| Outras fontes | components/theme/theme-provider.tsx | ThemeContext, resolveMode, applyThemeAttributes, ThemeProvider, useTheme |
| Outras fontes | components/ui/button.tsx | ButtonProps, Button |
| Outras fontes | components/ui/card.tsx | Card, CardHeader, CardTitle, CardDescription, CardContent |
| Outras fontes | components/ui/clinic-datetime-picker.tsx | clampMinute, clampHour, partsToCalendarDate, nowClinicParts, formatDisplay, ClinicDateTimePicker, onDocClick, onEsc |
| Outras fontes | components/ui/confirm-dialog.tsx | ConfirmDialog, useConfirmDialog |
| Outras fontes | components/ui/digital-signature-pad.tsx | DigitalSignaturePad |
| Outras fontes | components/ui/input.tsx | Input |
| Outras fontes | components/ui/label.tsx | Label |
| Outras fontes | components/ui/skeleton.tsx | Skeleton, SkeletonText, SkeletonCard |
| Outras fontes | components/ui/toaster.tsx | Toaster |
| Outras fontes | lib/agenda/actions.ts | invalidateAgendaCaches, getAuthContext, findConflict, fetchTimezone, fetchClientTitleSummary, setAppointmentProcedures, reloadAppointment, listAppointments |
| Outras fontes | lib/agenda/mapper.ts | procedureNameFromJoin, mapAppointmentRow, APPOINTMENT_SELECT |
| Outras fontes | lib/agenda/schemas.ts | APPOINTMENT_STATUSES, normalizeProcedureIds |
| Outras fontes | lib/agenda/temporal.ts | ensureTemporalPolyfill, getTemporalApi, isoToZoned, zonedToIso |
| Outras fontes | lib/agenda/types.ts | — |
| Outras fontes | lib/anamnesis/detect-font-size.ts | detectFieldFontSize, weightedAvg |
| Outras fontes | lib/anamnesis/detect-pdf-fields.ts | detectPdfFields, mapPdfFieldType, prettifyFieldName, clamp01, clampRange |
| Outras fontes | lib/anamnesis/page-raster-cache.ts | THUMB_BUCKET, MAX_MAIN_ENTRIES, MAX_THUMB_ENTRIES, isThumbKey, poolFor, makeKey, getCached, putCached |
| Outras fontes | lib/anamnesis/pdfjs.ts | loadPdfJs, loadPdfDocument |
| Outras fontes | lib/anamnesis/schema.ts | parseAnamnesisPayload |
| Outras fontes | lib/anamnesis/stroke-geometry.ts | getStrokeRenderConfig, strokePointsToInput, buildStrokeOutline, hasPressure, outlineToFlatPoints, outlineToSvgPath |
| Outras fontes | lib/anamnesis/submission-actions.ts | saveAnamnesisSubmission, submitAnamnesis, persistSubmittedState, flattenSubmission, fillNativePdfFields, hexToRgb, wrapText, getSubmissionPdfUrl |
| Outras fontes | lib/anamnesis/template-actions.ts | isFormDataFileLike, unsetDefaults, createAnamnesisTemplate, updateAnamnesisTemplate, deleteAnamnesisTemplate, getTemplateSignedUrl |
| Outras fontes | lib/anamnesis/template-schema.ts | ANAMNESIS_FIELD_TYPES, ANAMNESIS_SIGNATURE_FIELD_TYPES, isSignatureFieldType, ANAMNESIS_STROKE_TOOLS, getStrokePointPressure, ANAMNESIS_SUBMISSION_MODES, ANAMNESIS_SUBMISSION_STATUSES |
| Outras fontes | lib/anamnesis/thumb-render-queue.ts | MAX_CONCURRENT, pump, scheduleThumbRender |
| Outras fontes | lib/anamnesis/use-pinch-pan.ts | MIN_SCALE, MAX_SCALE, distance, midpoint, clampScale, clientToLocal, usePinchPan |
| Outras fontes | lib/anamnesis/use-viewer-width.ts | compute, useViewerWidth |
| Páginas | lib/app/site-origin.ts | getRequestSiteOrigin |
| Outras fontes | lib/auth/clinic-profile.ts | TENANT_ROLES, TENANT_MANAGER_ROLES, canAccessAgenda, isTenantManager, isClinicAdmin, isPlatformSuperAdmin, isPendingRegistration, fetchClinicProfile |
| Outras fontes | lib/auth/local-auth.ts | SESSION_COOKIE, getPool, sha256, hashPassword, getUserBySessionToken, sessionCookieName, getCurrentUserFromServerCookies, getCurrentUserFromRequest |
| Outras fontes | lib/auth/local-route-context.ts | AGENDA_ROLES, TENANT_MANAGER_ROLES, PLATFORM_ADMIN_ROLES, getCurrentSupabaseUser, createLocalServiceClient, requireLocalAgendaContext, requireLocalPlatformAdminContext |
| Outras fontes | lib/auth/page-guards.ts | requireClinicAdminPage |
| Outras fontes | lib/auth/post-login-path.ts | postLoginPathForClinicProfile |
| Outras fontes | lib/bootstrap.ts | parseBootstrapStatus |
| Outras fontes | lib/branding/actions.ts | buildBrandingStoragePath, signAssetUrls, listBrandingAssets, listBrandingProfiles, uploadBrandingAsset, deleteBrandingAsset, createBrandingProfile, updateBrandingProfile |
| Outras fontes | lib/branding/apply-to-pdf.ts | MM_TO_PT, mm, downloadAssetBytes, embedBrandingImage, resolveBrandingForPdf, drawBrandingOnPage, computeContentBox |
| Outras fontes | lib/branding/schemas.ts | BRANDING_KINDS, BRANDING_MIME_TYPES, MAX_BRANDING_BYTES, LOGO_POSITIONS, BRANDING_REQUIREMENTS, ABSOLUTE_MIN_PX, ABSOLUTE_MAX_PX, assertBrandingImageDimensions |
| Outras fontes | lib/budgets/actions.ts | EDITABLE_BUDGET_STATUSES, budgetStatusLabel, formatCurrency, assertClientInTenant, createBudget, assertBudgetEditable, mapUpdateBudgetRpcError, updateBudget |
| Outras fontes | lib/clients/actions.ts | digitsOnly, createPatient |
| Outras fontes | lib/clients/clinical-tenant-context.ts | requireClinicalTenantContext |
| Outras fontes | lib/clients/evolution-actions.ts | addEvolutionRich, uploadEvolutionPhoto, deleteEvolution |
| Outras fontes | lib/clients/history-export.schemas.ts | FULL_EXPORT_SECTIONS, SECTION_LABELS |
| Outras fontes | lib/clients/history-export.ts | BRL, DATE_FMT, DATETIME_FMT, fmtDate, fmtDateTime, fmtCurrency, budgetStatusLabel, anamnesisStatusLabel |
| Outras fontes | lib/clients/paciente-context.ts | loadPacienteClinicContext |
| Outras fontes | lib/clients/purchase-actions.ts | assertClientInTenant, createClientPurchase, linkPurchaseToContract |
| Outras fontes | lib/clients/record-actions.ts | requireClinicalContext, assertClientInTenant, revalidatePaciente, updatePatient, hidePatientFromUi, saveAnamnesis, addEvolution, storageKeyReferencedInClinicalTables |
| Outras fontes | lib/clients/schemas.ts | — |
| Outras fontes | lib/clinical/body-regions.ts | BODY_REGIONS, BODY_REGION_LABELS, BODY_REGION_OPTIONS, FACE_BONECO_ANGLES, CAPTURE_ANGLE_LABELS, MAX_PHOTOS_PER_BATCH, isBodyRegion, isFaceBonecoAngle |
| Outras fontes | lib/clinical/document-kinds.ts | DOCUMENT_KINDS, DOCUMENT_KIND_LABELS, DOCUMENT_KIND_OPTIONS, SYSTEM_DOCUMENT_KINDS |
| Outras fontes | lib/clinical/library-photo-upload.ts | assertClientVisibleInTenant, prepareLibraryPhotoBuffer, uploadPatientLibraryPhotoCore |
| Outras fontes | lib/clinical/photo-display.ts | getPhotoDisplayAt, formatPhotoCapturedAt, getPhotoDisplayDateKey |
| Outras fontes | lib/clinical/photo-file-validation.ts | PHOTO_ACCEPT, PHOTO_MIME, PHOTO_EXTENSIONS, isAllowedPhotoFile, filterAllowedPhotoFiles, assertPhotoFileSignature |
| Outras fontes | lib/clinical/photo-thumb.ts | THUMB_MAX_WIDTH, THUMB_QUALITY, thumbStorageKey, generatePhotoThumb, resizePhotoForProxy |
| Outras fontes | lib/clinical/storage.ts | CLINICAL_BUCKET, PHOTO_MIME, DOC_MIME, SIGNATURE_MIME, MAX_PHOTO_BYTES, MAX_PHOTO_BATCH_BYTES, MAX_DOCUMENT_BYTES, MAX_SIGNATURE_BYTES |
| Outras fontes | lib/contracts/html-contract-merge.ts | escapeHtml, displayOrDash, applyClientContractPlaceholders, toDataUrl, downloadAsDataUrl, SIG_PENDING, applyProfessionalContractPlaceholders |
| Outras fontes | lib/contracts/sanitize-html.ts | sanitizeContractHtml |
| Outras fontes | lib/contracts/submission-actions.ts | saveContractSubmission, submitContract, persistSubmittedState, flattenSubmission, hexToRgb, wrapText, deleteContractSubmission |
| Outras fontes | lib/contracts/template-actions.ts | unsetDefaultsForTenant, createContractTemplateFromEditor, createContractTemplateFromFile, updateContractTemplateFromEditor, setDefaultContractTemplate, updateContractTemplateFields, getContractTemplateSignedUrl, deleteContractTemplate |
| Outras fontes | lib/dashboard/phrases.ts | periodForHour, ROTATION, categoriesForMoment, pickPhraseForMoment |
| Outras fontes | lib/dates.ts | CLINIC_TIMEZONE, getClinicLocalParts, getDayBoundsUtcIso, formatTimeLabel, formatWeekdayLong, clinicNowDateTimeLocalValue, clinicDateTimeLocalToUtcIso, parseClinicDateTimeLocal |
| Outras fontes | lib/evolutions/submission-actions.ts | saveEvolutionSubmission, submitEvolution, persistSubmittedState, flattenSubmission, hexToRgb, wrapText, deleteEvolutionSubmission, linkPhotoToEvolutionSubmission |
| Outras fontes | lib/evolutions/template-actions.ts | isFormDataFileLike, unsetDefaults, createEvolutionTemplate, updateEvolutionTemplate, deleteEvolutionTemplate |
| Outras fontes | lib/financial/access.ts | canAccessFinancial, requireFinancialContext |
| Outras fontes | lib/financial/actions.ts | bumpAll, createFinancialAccount, updateFinancialAccount, deleteFinancialAccount, createFinancialCategory, updateFinancialCategory, deleteFinancialCategory, createFinancialPaymentMethod |
| Outras fontes | lib/financial/dispatcher.ts | ensureTransaction, reverseTransactionBySource, dispatchSaleCreated, dispatchSaleCancelled, dispatchBudgetApproved, dispatchBudgetCancelled, dispatchProcedurePurchaseCreated, dispatchProcedurePurchaseCancelled |
| Outras fontes | lib/financial/queries.ts | listAccounts, listAccountsWithBalance, listCategories, listPaymentMethods, listTransactions, monthBounds, loadFinancialKpis, topOf |
| Outras fontes | lib/financial/reports.ts | monthBounds, loadDreReport, toRows, loadPendingTransactions, loadRevenueByProcedure, loadRevenueByProfile, defaultMonthRange |
| Outras fontes | lib/financial/schemas.ts | ACCOUNT_KINDS, CATEGORY_KINDS, PAYMENT_METHOD_KINDS, TRANSACTION_KINDS, TRANSACTION_STATUSES, TRANSACTION_SOURCE_KINDS, parseBrlToCents, centsToBrl |
| Outras fontes | lib/google/calendar-client.ts | getCalendarClient, normalizeGoogleEvent, listEventsWindow, listEventsIncremental, insertEvent, updateEvent, deleteEvent |
| Outras fontes | lib/google/crypto.ts | ALGO, getKey, encryptToken, decryptToken |
| Outras fontes | lib/google/env.ts | inspectGoogleEnv, isGoogleEnvConfigured, getGoogleEnv, getSyncSecret |
| Outras fontes | lib/google/oauth.ts | GOOGLE_CALENDAR_SCOPES, createOAuthClient, buildAuthorizationUrl, exchangeCodeForTokens, createClientWithRefreshToken |
| Outras fontes | lib/google/provider-settings.ts | loadGoogleProviderSettings |
| Outras fontes | lib/google/sync.ts | loadConnection, getGoogleCalendarForTenant, applyIncomingGoogleEvents, runIncrementalPull, pushSystemChange |
| Outras fontes | lib/greeting.ts | greetingForHour, firstNameFromFullName |
| Outras fontes | lib/profiles/professional-asset-actions.ts | uploadProfileAsset, uploadMyProfileStamp, uploadMyProfileSignature |
| Outras fontes | lib/query/keys.ts | — |
| Outras fontes | lib/query/server.ts | createServerQueryClient, dehydrateClient |
| Outras fontes | lib/sales/actions.ts | createSale |
| Outras fontes | lib/sales/completeness.ts | computeClientCompleteness, hasSignedContractForProcedure, computeSaleFeasibility |
| Outras fontes | lib/stock/actions.ts | normalizeSku, createProduct, updateProduct, setProductArchived, adjustProductStock, createProcedure, updateProcedure, setProcedureArchived |
| Outras fontes | lib/stock/schemas.ts | computePriceCents |
| Outras fontes | lib/strings.ts | slugifyName |
| Outras fontes | lib/supabase/bootstrap-status.ts | getBootstrapStatusServer |
| Outras fontes | lib/supabase/client.ts | createBrowserSupabaseClient |
| Outras fontes | lib/supabase/clinic.ts | clinic |
<!-- specsfy:documentator:end -->

## Complemento auditado

| Módulo | Responsabilidade | Fontes principais |
| --- | --- | --- |
| Autenticação e tenancy | Sessão, perfil, papéis, redirects e contexto seguro | `middleware.ts`, `lib/auth/`, `lib/supabase/` |
| Agenda | Agendamentos, múltiplos procedimentos, conflitos e Google Calendar | `app/(dashboard)/agenda/`, `components/agenda/`, `lib/agenda/`, `lib/google/` |
| Pacientes e prontuário | Cadastro, ficha, histórico e vínculos clínicos | `app/(dashboard)/pacientes/`, `components/clients/`, `lib/clients/` |
| Anamnese e evolução | Templates PDF, submissões, tinta, assinatura e fotos | `components/anamnesis/`, `components/evolutions/`, `lib/anamnesis/`, `lib/evolutions/` |
| Contratos e documentos | Templates HTML/PDF, submissão, branding e assinatura | `components/contracts/`, `components/configuracoes/`, `lib/contracts/`, `lib/branding/` |
| Orçamentos e vendas | Orçamento, itens, compra e completude da venda | `components/budgets/`, `components/sales/`, `lib/budgets/`, `lib/sales/` |
| Estoque | Produtos, procedimentos, BOM e consumo atômico | `components/stock/`, `lib/stock/` |
| Financeiro | Contas, categorias, transações, dispatch e relatórios | `components/financeiro/`, `lib/financial/` |
| Plataforma | Gestão global de clínicas e usuários | `app/(dashboard)/plataforma/`, `components/plataforma/` |
| Tema e interface | Tokens, preferências, shell e feedback | `app/globals.css`, `components/theme/`, `components/layout/`, `components/ui/` |

Server Actions e handlers são endpoints públicos: cada mutação deve validar o
payload, autenticar, autorizar o objeto dentro do tenant e revalidar a UI
afetada. Operações privilegiadas com service role ficam somente no servidor.
