# Perfil de interação do Specsfy

Este arquivo guarda somente o nível de conhecimento e as respostas confirmadas
durante o setup. Ele orienta a forma da conversa e não substitui `PROJECT.md`,
`STACK.md`, `RULES.md`, `DATABASE.md`, `INTERFACE.md`, `DESIGNSYSTEM.MD` ou uma
spec.

## Nível de conhecimento

| Campo | Valor |
| --- | --- |
| Nível atual | intermediário |
| Fonte da confirmação | Resposta da pessoa, opção 2, em 2026-09-22 |
| Última confirmação | 2026-09-22 |

Valores permitidos: `iniciante`, `intermediário` e `experiente`.

## Respostas confirmadas

Registre somente respostas dadas pela pessoa ou declarações inequívocas já
presentes nas fontes lidas. Não registre segredos, tokens, senhas ou dados de
produção.

| Área | Pergunta ou assunto | Resposta normalizada | Fonte | Confirmado em |
| --- | --- | --- | --- | --- |
| Setup | Raiz do projeto | `/Users/hygorfragas/Documents/Documentos/sistema_agenda_clinicas` | Resposta da pessoa, opção 1 (diretório atual), em 2026-09-22 | 2026-09-22 |
| Produto | Objetivo e resultado principal | SaaS multitenant para clínica de estética, com agenda, pacientes, anamnese, evolução, orçamentos, sessões, documentos com assinatura, fotos clínicas e estoque básico. Resultado: operação diária digital de uma profissional de estética. | `AGENTS.md` | 2026-09-22 |
| Acesso | Autenticação | Login por e-mail e senha; sessão pelo Supabase Auth; perfis vinculados ao tenant. | `.cursor/rules/02-multitenancy-security.mdc` | 2026-09-22 |
| Integrações | Serviços dependentes | Supabase, Cloudflare R2, Google Calendar e React Konva. | `AGENTS.md` | 2026-09-22 |
| Deploy | Publicação | Imagem `hygorfragas/clinica` em linux/amd64, via `npm run docker:push`. | `AGENTS.md` | 2026-09-22 |
| Pessoas | Papéis | `pending_registration` aguarda acesso. No tenant: `agent` opera a agenda; `clinic_admin` também acessa Financeiro, Equipe e configurações completas; `owner` com tenant gere agentes, sem o acesso de `clinic_admin`. Sem tenant, `owner` ou `platform_super_admin` é superadmin da plataforma (`/plataforma`). Pessoa usuária principal: profissional de estética. | `lib/auth/clinic-profile.ts`, `components/layout/clinic-nav.tsx`, `AGENTS.md` | 2026-09-22 |
| Acesso | Permissões de navegação | Menu operacional para quem tem tenant. Financeiro e Equipe só habilitados para `clinic_admin`. | `components/layout/clinic-nav.tsx`, `lib/auth/clinic-profile.ts` | 2026-09-22 |

## Uso pelo setup

- Antes de perguntar, leia este arquivo, a conversa atual e os contextos do
  projeto disponíveis.
- Uma resposta já registrada ou explicitamente declarada em outra fonte não
  volta a ser perguntada.
- Se fontes divergirem, pergunte apenas para resolver a divergência e registre
  a nova fonte e o alcance da resposta.
