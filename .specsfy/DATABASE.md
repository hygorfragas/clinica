# Banco de dados

Mapa de persistência do sistema. Modelo inicial sugerido para
**Next.js**.

Para Next.js, explicite App Router, Server Components, Client Components e fronteiras entre servidor e navegador.

## Fontes de dados

<!-- specsfy:database:start -->
| Fonte | Tecnologia/forma | Evidência |
| --- | --- | --- |
| Estrutura | Schema/migration | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260407180000_contract_templates_and_document_body.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260408120000_client_procedure_purchases_photo_links.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260418120000_agenda_google_calendar.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260418130000_anamnesis_templates_and_submissions.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260418150000_inventory_and_procedure_pricing.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260419120000_clinic_document_branding.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260420120000_user_theme_preferences.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260501150000_financial_module.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260502120000_evolution_templates_and_submissions.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260502130000_dashboard_phrases.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260502140000_contract_submissions.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260801120000_procedure_bom_items.sql` |
| Estrutura | Schema/migration | `supabase/migrations/20260819130000_appointment_procedures.sql` |

## Estruturas detectadas

| Estrutura | Tipo | Campos | Relações | Fonte |
| --- | --- | --- | --- | --- |
| clinic.tenants | Tabela SQL | id:uuid, name:text, slug:text, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| clinic.profiles | Tabela SQL | id, tenant_id, full_name, phone, professional_registration, cpf, address, signature_storage_key, stamp_storage_key, role, theme_accent_preset, theme_mode, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260321195600`, `20260407200000`, `20260420120000` |
| clinic.clients | Tabela SQL | id, tenant_id, full_name, email, phone, cpf, address, birth_date, notes, hidden_from_ui_at, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260321195600`, `20260407190000`, `20260407200000` |
| clinic.appointments | Tabela SQL | id, tenant_id, client_id, starts_at, ends_at, status, notes, title, color, location, source, procedure_id, google_event_id, google_calendar_id, google_etag, google_sync_status, google_synced_at, created_by_profile_id, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260321195600`, `20260418120000` |
| clinic.anamnesis_forms | Tabela SQL | id:uuid, tenant_id:uuid, client_id:uuid, payload:jsonb, schema_version:int, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| clinic.evolutions | Tabela SQL | id, tenant_id, client_id, appointment_id, body, procedure_id, purchase_id, session_number, created_by_profile_id, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260321195600`, `20260418140000` |
| clinic.procedures | Tabela SQL | id, tenant_id, name, description, default_price_cents, duration_minutes, cost_cents, profit_margin_percent, price_cents, contract_template_id, requires_signed_contract, is_archived, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260321195600`, `20260418150000` |
| clinic.budgets | Tabela SQL | id, tenant_id, client_id, title, status, currency, subtotal_cents, discount_cents, total_cents, valid_until, cancelled_at, cancellation_reason, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260321195600`, `20260421120000` |
| clinic.budget_items | Tabela SQL | id:uuid, tenant_id:uuid, budget_id:uuid, procedure_id:uuid, description:text, quantity:numeric, unit_price_cents:int, line_total_cents:int, display_order:int, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| clinic.sessions | Tabela SQL | id:uuid, tenant_id:uuid, client_id:uuid, budget_id:uuid, appointment_id:uuid, started_at:timestamptz, ended_at:timestamptz, status:text, notes:text, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| clinic.stock_items | Tabela SQL | id:uuid, tenant_id:uuid, name:text, sku:text, unit:text, quantity_numeric:numeric, min_quantity:numeric, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| clinic.stock_movements | Tabela SQL | id:uuid, tenant_id:uuid, stock_item_id:uuid, quantity_delta:numeric, reason:text, ref_type:text, ref_id:uuid, created_at:timestamptz | Não detectadas | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| clinic.documents | Tabela SQL | id, tenant_id, client_id, kind, title, storage_key, mime_type, body_html, source_template_id, responsible_profile_id, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260321195600`, `20260407180000`, `20260407200000` |
| clinic.photos | Tabela SQL | id, tenant_id, client_id, storage_key, caption, taken_at, body_region, capture_angle, purchase_id, comparison_role, evolution_id, evolution_submission_id, phase, captured_at, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260321195600`, `20260407160000`, `20260408120000`, `20260418140000`, `20260525120000`, `20260627120000` |
| clinic.signatures | Tabela SQL | id:uuid, tenant_id:uuid, client_id:uuid, document_id:uuid, image_storage_key:text, signed_at:timestamptz, signer_name:text, signer_role:text, client_metadata:jsonb, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| clinic.google_calendar_connections | Tabela SQL | id:uuid, tenant_id:uuid, profile_id:uuid, google_account_email:text, calendar_id:text, refresh_token_ciphertext:text, access_token_ciphertext:text, token_expires_at:timestamptz, scopes:text, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260321195600_initial_multitenant_clinic_schema.sql` |
| clinic.contract_templates | Tabela SQL | id:uuid, tenant_id:uuid, title:text, body_html:text, storage_key:text, mime_type:text, is_default:boolean, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260407180000_contract_templates_and_document_body.sql` |
| clinic.client_procedure_purchases | Tabela SQL | id:uuid, tenant_id:uuid, client_id:uuid, title:text, procedure_id:uuid, budget_id:uuid, total_cents:int, currency:text, purchased_at:timestamptz, contract_document_id:uuid, responsible_profile_id:uuid, notes:text, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260408120000_client_procedure_purchases_photo_links.sql` |
| clinic.calendar_settings | Tabela SQL | tenant_id, google_sync_mode, pull_interval_minutes, default_calendar_id, default_slot_minutes, business_hours, timezone, google_oauth_client_id, google_oauth_client_secret, google_oauth_redirect_uri, google_sync_secret, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migrations `20260418120000`, `20260418210000` |
| clinic.google_calendar_sync_state | Tabela SQL | id:uuid, tenant_id:uuid, connection_id:uuid, calendar_id:text, sync_token:text, last_synced_at:timestamptz, last_error:text, webhook_channel_id:text, webhook_resource_id:text, webhook_expires_at:timestamptz, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260418120000_agenda_google_calendar.sql` |
| clinic.google_calendar_outbox | Tabela SQL | id:uuid, tenant_id:uuid, appointment_id:uuid, operation:text, payload:jsonb, attempts:int, last_error:text, processed_at:timestamptz, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260418120000_agenda_google_calendar.sql` |
| clinic.anamnesis_templates | Tabela SQL | id:uuid, tenant_id:uuid, name:text, description:text, pdf_storage_path:text, page_count:integer, is_default:boolean, is_archived:boolean, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260418130000_anamnesis_templates_and_submissions.sql` |
| clinic.anamnesis_submissions | Tabela SQL | id, tenant_id, client_id, template_id, mode, status, form_values, ink_strokes, flattened_pdf_path, signer_name, signed_at, submitted_at, created_by_profile_id, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migration `20260418130000` |
| clinic.products | Tabela SQL | id, tenant_id, name, sku, description, unit, stock_quantity numeric(14,3), low_stock_threshold numeric(14,3), cost_cents, price_cents, is_archived, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migration `20260418150000` |
| clinic.inventory_movements | Tabela SQL | id, tenant_id, product_id, delta numeric(14,3), reason, note, ref_table, ref_id, created_by_profile_id, created_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migration `20260418150000` |
| clinic.branding_assets | Tabela SQL | id:uuid, tenant_id:uuid, kind:text, label:text, storage_key:text, mime_type:text, width_px:integer, height_px:integer, file_size:integer, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260419120000_clinic_document_branding.sql` |
| clinic.document_branding_profiles | Tabela SQL | id:uuid, tenant_id:uuid, name:text, is_default:boolean, show_header:boolean, show_footer:boolean, show_logo:boolean, header_asset_id:uuid, footer_asset_id:uuid, logo_asset_id:uuid, logo_position:text, logo_scale_pct:integer, header_height_mm:integer, footer_height_mm:integer, margin_top_mm:integer, margin_right_mm:integer, margin_bottom_mm:integer, margin_left_mm:integer, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260419120000_clinic_document_branding.sql` |
| clinic.clinic_theme_settings | Tabela SQL | tenant_id:uuid, default_accent_preset:text, default_mode:text, updated_at:timestamptz, updated_by_profile_id:uuid | Não detectadas | `supabase/migrations/20260420120000_user_theme_preferences.sql` |
| clinic.financial_accounts | Tabela SQL | id:uuid, tenant_id:uuid, name:text, kind:text, opening_balance_cents:bigint, currency:text, is_archived:boolean, notes:text, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260501150000_financial_module.sql` |
| clinic.financial_categories | Tabela SQL | id:uuid, tenant_id:uuid, name:text, kind:text, parent_id:uuid, is_archived:boolean, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260501150000_financial_module.sql` |
| clinic.financial_payment_methods | Tabela SQL | id:uuid, tenant_id:uuid, name:text, kind:text, default_account_id:uuid, is_archived:boolean, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260501150000_financial_module.sql` |
| clinic.financial_transactions | Tabela SQL | id, tenant_id, kind, status, amount_cents, description, notes, occurred_on, due_date, paid_at, account_id, category_id, payment_method_id, client_id, responsible_profile_id, source_kind, source_id, reverses_transaction_id, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migration `20260501150000` |
| clinic.evolution_templates | Tabela SQL | id:uuid, tenant_id:uuid, name:text, description:text, pdf_storage_path:text, page_count:integer, form_schema:jsonb, ink_regions:jsonb, is_default:boolean, is_archived:boolean, created_at:timestamptz, updated_at:timestamptz | Não detectadas | `supabase/migrations/20260502120000_evolution_templates_and_submissions.sql` |
| clinic.evolution_submissions | Tabela SQL | id, tenant_id, client_id, template_id, mode, status, form_values, ink_strokes, flattened_pdf_path, signer_name, signed_at, submitted_at, created_by_profile_id, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migration `20260502120000` |
| public.dashboard_phrases | Tabela SQL | id:uuid, category:text, text:text, is_active:boolean, created_at:timestamptz | Não detectadas | `supabase/migrations/20260502130000_dashboard_phrases.sql` |
| clinic.contract_submissions | Tabela SQL | id, tenant_id, client_id, template_id, mode, status, form_values, ink_strokes, flattened_pdf_path, signer_name, signed_at, submitted_at, created_by_profile_id, created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migration `20260502140000` |
| clinic.procedure_bom_items | Tabela SQL | id, tenant_id, procedure_id, product_id, quantity numeric(14,3), created_at, updated_at | Ver mapa relacional abaixo | `lib/supabase/database.types.ts`; migration `20260801120000` |
| clinic.appointment_procedures | Tabela SQL | id:uuid, tenant_id:uuid, appointment_id:uuid, procedure_id:uuid, display_order:int, created_at:timestamptz | Não detectadas | `supabase/migrations/20260819130000_appointment_procedures.sql` |
<!-- specsfy:database:end -->

## Decisões, ownership e retenção

### Fontes e schemas

| Fonte | Responsabilidade | Configuração segura | Evidência |
| --- | --- | --- | --- |
| PostgreSQL via Supabase | Persistência transacional principal | `NEXT_PUBLIC_SUPABASE_URL` e chaves por papel; valores não documentados | `lib/supabase/`, `supabase/migrations/` |
| Schema `clinic` | Domínio multitenant da clínica | RLS por `clinic.user_tenant_id()` e `tenant_id` | migration `20260321195600` e incrementais |
| Schema `auth` | Identidade e sessões | Supabase Auth; tabelas não expostas ao cliente | `lib/auth/`, `lib/supabase/` |
| Schemas `storage` e `public` | Objetos clínicos privados e funções auxiliares | bucket `clinical` privado; policies por primeiro segmento do path | migration `20260407150000`, `supabase/manual/01_clinic_bootstrap_status.sql` |

### Mapa relacional observado

| Domínio | Relações e cardinalidade |
| --- | --- |
| Tenancy e acesso | `tenants` 1:N `profiles`, `clients` e demais entidades clínicas com `tenant_id`; `profiles.id` referencia a identidade autenticada. |
| Agenda | `clients` 1:N `appointments`; `appointments` N:N `procedures` por `appointment_procedures`; o procedimento legado direto permanece opcional; o criador referencia `profiles`. |
| Prontuário | `clients` 1:N anamneses, evoluções, documentos, fotos e assinaturas; cada submissão N:1 template; cada assinatura N:1 documento. |
| Comercial | `clients` 1:N `budgets`; `budgets` 1:N `budget_items`; itens N:1 `procedures`; compras podem referenciar procedimento, orçamento, documento e responsável. |
| Sessões | `sessions` referencia cliente e opcionalmente orçamento e agendamento; `evolutions` pode referenciar agendamento, procedimento, compra e profissional. |
| Estoque | `procedure_bom_items` liga N:N `procedures` e `products` com quantidade; `inventory_movements` referencia produto e origem lógica; `stock_items`/`stock_movements` são o modelo legado. |
| Documentos e fotos | `documents` pode referenciar template e responsável; `photos` pode referenciar compra, evolução e submissão; binários são ligados por storage keys. |
| Agenda Google | Conexão pertence a tenant e profile; settings pertencem ao tenant; sync state pertence à conexão; outbox pertence a agendamento. |
| Branding e tema | Assets pertencem ao tenant; perfis de branding referenciam header, footer e logo; tema pertence ao tenant e pode referenciar o profile atualizador. |
| Financeiro | Contas, categorias, métodos e transações pertencem ao tenant; categorias são hierárquicas; transações podem referenciar conta, categoria, método, cliente, responsável, origem e estorno. |

### Integridade, índices e segurança

- O schema `clinic` usa UUIDs, timestamps com fuso e valores monetários em
  centavos. Quantidades de estoque usam `numeric(14,3)`.
- As tabelas clínicas têm RLS habilitada nas migrations e policies baseadas em
  `clinic.user_tenant_id()`; `service_role` é reservado ao servidor. A tabela
  global `public.dashboard_phrases` também tem RLS.
- Há índices por `tenant_id` e pelos principais acessos compostos. Unicidades
  relevantes incluem template/default por tenant, branding default, evento
  Google por tenant, item BOM por procedimento/produto, procedimento por
  agendamento e consumo de estoque por agendamento/produto.
- As RPCs `clinic.update_budget`, `clinic.consume_appointment_stock` e
  `clinic.set_appointment_procedures` executam mudanças multi-linha de forma
  atômica; orçamento e estoque tratam concorrência ou idempotência nas
  migrations `20260819120000` e `20260801123000`.
- `documents` exige storage key ou conteúdo HTML. Fotos restringem região,
  ângulo e papel de comparação por constraints. Credenciais e tokens do Google
  são dados secretos e não devem aparecer em clientes, logs ou documentação.

### Ciclo de vida e retenção

- `clients.hidden_from_ui_at` implementa ocultação sem exclusão física;
  `procedures`, `products`, templates e cadastros financeiros usam flags de
  arquivamento. Orçamentos registram cancelamento e motivo.
- A retenção e a expiração de prontuários, fotos, documentos e tokens não estão
  formalizadas nas migrations ou documentos inspecionados; permanecem não
  identificadas e exigem decisão de produto/compliance antes de automação.
- Migrations são append-only em `supabase/migrations/`; alterações manuais no
  banco não substituem o histórico versionado nem a regeneração de
  `lib/supabase/database.types.ts`.
