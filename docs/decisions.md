# Decisões técnicas

<!-- specsfy:documentator:start -->
## Política

Decisões explícitas em `PROJECT.md` e `.specsfy/` prevalecem sobre inferências deste documento.
<!-- specsfy:documentator:end -->

## Complemento auditado

| Decisão explícita | Fonte |
| --- | --- |
| Multi-tenant e RLS desde o início | `AGENTS.md`, `.cursor/rules/02-multitenancy-security.mdc` |
| Schema de domínio `clinic` exposto ao PostgREST | `.cursor/rules/04-backend-supabase.mdc`, migrations |
| Next.js App Router, React e TypeScript estrito | `AGENTS.md`, `.cursor/rules/01-architecture-stack.mdc`, `tsconfig.json` |
| Dados clínicos e arquivos privados, com signed URLs | `AGENTS.md`, `.cursor/rules/05-storage-google-calendar.mdc` |
| DM Sans e tema leve com verde-sálvia | `.cursor/rules/09-typography-and-theme.mdc`, `.interface-design/system.md` |
| Release Docker semver para `linux/amd64` | `.cursor/rules/10-docker-image-versioning.mdc` |
| Pipeline completa somente ao criar PR | `.cursor/rules/11-release-pr-pipeline.mdc` |
| ClickUp sincronizado somente quando houver task explícita | `.cursor/rules/08-clickup-roadmap-sincronia.mdc` |

Cloudflare R2, MinIO e remoção do SDK Supabase aparecem como direção ou
transição documental; o código observado continua usando Supabase Auth e
Supabase Storage em produção.
