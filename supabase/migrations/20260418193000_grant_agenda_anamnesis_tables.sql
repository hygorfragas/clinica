-- Corrige permissões de tabelas criadas após o schema inicial.
-- Sem esses GRANTs, o role `authenticated` recebe "permission denied"
-- mesmo com políticas RLS válidas.

grant usage on schema clinic to authenticated, service_role;

grant select, insert, update, delete
  on clinic.calendar_settings
  to authenticated, service_role;

grant select, insert, update, delete
  on clinic.google_calendar_sync_state
  to authenticated, service_role;

grant select, insert, update, delete
  on clinic.google_calendar_outbox
  to authenticated, service_role;

grant select, insert, update, delete
  on clinic.anamnesis_templates
  to authenticated, service_role;

grant select, insert, update, delete
  on clinic.anamnesis_submissions
  to authenticated, service_role;
