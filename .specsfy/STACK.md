# Stack do sistema

Documente tecnologias estruturais e a evidência executável que confirma cada
uma. Preserve decisões humanas nas seções livres deste arquivo.

## Inventário detectado

<!-- specsfy:stack:start -->
| Camada | Tecnologia | Evidência |
| --- | --- | --- |
| Framework web | Next.js 15, App Router | `package.json` (`next`), `app/`, `next.config.ts` |
| Biblioteca de interface | React 19 | `package.json` (`react`, `react-dom`), `components/` |
| Linguagem | TypeScript em modo estrito | `package.json` (`typescript`), `tsconfig.json` |
| Runtime e pacotes | Node.js 22, npm | `.nvmrc`, `package-lock.json` |
| Estilos | Tailwind CSS 3 + PostCSS | `package.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css` |
| Formulários e validação | React Hook Form + Zod | `package.json` (`react-hook-form`, `@hookform/resolvers`, `zod`) |
| Estado remoto | TanStack Query | `package.json` (`@tanstack/react-query`), `components/providers/query-provider.tsx` |
| Backend gerenciado | Supabase Auth, PostgREST e Storage | `package.json` (`@supabase/ssr`, `@supabase/supabase-js`), `lib/supabase/`, `supabase/migrations/` |
| Persistência | PostgreSQL, schemas `clinic`, `auth`, `public` e `storage` | `supabase/migrations/`, `lib/supabase/database.types.ts`, `package.json` (`pg`) |
| Integração de agenda | Google Calendar API e OAuth 2 | `package.json` (`googleapis`, `google-auth-library`), `lib/google/`, `app/api/agenda/google/` |
| Interface clínica | React Konva e Canvas | `package.json` (`konva`, `react-konva`), `components/clients/face-puppet-guide.tsx` |
| Documentos e imagens | pdf-lib, PDF.js, Sharp e Signature Pad | `package.json`, `lib/anamnesis/`, `lib/clinical/` |
| Infraestrutura | Docker multi-stage e Compose; alvo de release `linux/amd64` | `Dockerfile`, `docker-compose.yml`, `scripts/docker-release.sh` |
<!-- specsfy:stack:end -->

## Decisões e observações do projeto

- A aplicação usa Server Components por padrão e concentra interação em Client
  Components com `"use client"`; Server Actions e Route Handlers são fronteiras
  públicas que exigem autenticação, autorização por tenant e validação.
- O runtime observado usa Supabase Storage no bucket privado `clinical`. A
  arquitetura desejada também cita Cloudflare R2, mas não há cliente R2 ativo
  nos manifests ou módulos inspecionados.
- `Zustand` consta nas instruções como stack-base, porém não está instalado no
  manifest atual; não deve ser tratado como dependência implementada.
- O deploy produz o build standalone do Next.js e publica a imagem
  `hygorfragas/clinica:<semver>` para `linux/amd64`.
