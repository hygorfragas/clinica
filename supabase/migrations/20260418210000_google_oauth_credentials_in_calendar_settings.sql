-- Permite configuração da integração Google diretamente na aba Agenda,
-- armazenando as credenciais por tenant em clinic.calendar_settings.

alter table clinic.calendar_settings
  add column if not exists google_oauth_client_id text,
  add column if not exists google_oauth_client_secret text,
  add column if not exists google_oauth_redirect_uri text,
  add column if not exists google_sync_secret text;
