# Integrações

<!-- specsfy:documentator:start -->
## Configuração

Valores de ambiente e integrações são documentados apenas pelos nomes declarados localmente, sem segredos.
<!-- specsfy:documentator:end -->

## Complemento auditado

| Integração | Configuração por nome, sem valor | Evidência |
| --- | --- | --- |
| Supabase Auth/PostgREST | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `.env.example`, `lib/supabase/` |
| PostgreSQL direto | `DATABASE_URL` | `.env.example`, `lib/auth/local-auth.ts` |
| Storage S3 compatível desejado | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_CLINICAL` | `.env.example`; runtime principal ainda usa Supabase Storage |
| Google Calendar | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_CALENDAR_SYNC_SECRET`, webhook opcional | `.env.example`, `lib/google/`, `app/api/agenda/google/` |
| URL pública | `NEXT_PUBLIC_APP_URL` | `.env.example`, `lib/app/site-origin.ts` |
| Docker Hub | imagem `hygorfragas/clinica:<semver>` | `Dockerfile`, `docker-compose.yml`, `scripts/docker-release.sh` |

Credenciais do Google podem existir em settings por tenant e são tratadas como
segredo. Service role, chaves S3 e tokens OAuth nunca pertencem ao cliente.
