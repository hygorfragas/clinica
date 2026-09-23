# Perfil de interação do Specsfy

Este arquivo guarda somente o nível de conhecimento e as respostas confirmadas
durante o setup. Ele orienta a forma da conversa e não substitui `PROJECT.md`,
`STACK.md`, `RULES.md`, `DATABASE.md`, `INTERFACE.md`, `DESIGNSYSTEM.MD` ou uma
spec.

## Nível de conhecimento

| Campo | Valor |
| --- | --- |
| Nível atual | A confirmar |
| Fonte da confirmação | A confirmar |
| Última confirmação | A confirmar |

Valores permitidos: `iniciante`, `intermediário` e `experiente`.

## Respostas confirmadas

Registre somente respostas dadas pela pessoa ou declarações inequívocas já
presentes nas fontes lidas. Não registre segredos, tokens, senhas ou dados de
produção.

| Área | Pergunta ou assunto | Resposta normalizada | Fonte | Confirmado em |
| --- | --- | --- | --- | --- |
| Produto | Objetivo e resultado principal | SaaS multitenant para clínica de estética: substituir papel por operação web de agenda, prontuário, documentos, orçamentos, sessões, fotos e estoque, com isolamento por tenant. | `PROJECT.md`, `AGENTS.md` | 2026-09-22 |
| Pessoas | Usuárias, equipes e papéis | Profissional da clínica; administrador (`clinic_admin`); agente (`agent`); superadministrador da plataforma (`owner` / `platform_super_admin`); paciente nos fluxos interativos. | `PROJECT.md` | 2026-09-22 |
| Acesso | Autenticação e permissões | Login por e-mail e senha via Supabase Auth; perfis vinculados a tenant; RLS obrigatório; área `/plataforma` para superadmin sem tenant implícito. | `PROJECT.md`, `.specsfy/RULES.md`, `.specsfy/STACK.md` | 2026-09-22 |
| Dados | Entidades e persistência | PostgreSQL/Supabase com schemas `clinic`, `auth`, `public` e `storage`; entidades clínicas com `tenant_id` e RLS; storage privado `clinical` com URLs assinadas. | `.specsfy/DATABASE.md`, `.specsfy/STACK.md` | 2026-09-22 |
| Interface | Telas e composição | Next.js 15 App Router, React 19, Tailwind CSS 3; páginas Server Components; interação em Client Components; mapa canônico em `INTERFACE.md`; primitives locais em `components/ui/`. | `INTERFACE.md`, `.specsfy/STACK.md` | 2026-09-22 |
| Operação | Testes e deploy | Typecheck obrigatório (`npm run typecheck`); imagem Docker `hygorfragas/clinica:X.Y.Z` via `npm run docker:push` para `linux/amd64`. Runner de testes automatizados não identificado no manifest. | `.specsfy/RULES.md`, `package.json`, `docs/README.md` | 2026-09-22 |
| Integrações | Serviços dependentes | Supabase (Auth, PostgREST, Storage); Google Calendar API/OAuth; Docker/Compose para release. Cloudflare R2 está nas instruções desejadas, sem cliente ativo nos manifests. | `.specsfy/STACK.md`, `PROJECT.md` | 2026-09-22 |

## Uso pelo setup

- Antes de perguntar, leia este arquivo, a conversa atual e os contextos do
  projeto disponíveis.
- Uma resposta já registrada ou explicitamente declarada em outra fonte não
  volta a ser perguntada.
- Se fontes divergirem, pergunte apenas para resolver a divergência e registre
  a nova fonte e o alcance da resposta.
