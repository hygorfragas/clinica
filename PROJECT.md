# Projeto

## História e motivação

O projeto nasceu para substituir processos manuais de uma clínica de estética
por uma operação web centralizada. A base evoluiu de uma fundação Next.js e
Supabase para um SaaS multitenant em produção, com agenda, prontuário,
documentos, fotos, vendas, estoque e financeiro. O histórico versionado mostra
entregas incrementais entre março e agosto de 2026, chegando à versão 1.1.4.

Fontes: `AGENTS.md`, `documentacao/prd_clinica_estetica.md`,
`documentacao/roadmap_e_plano_clickup.md`, `historico.md` e `package.json`.

## Finalidade

Oferecer uma rotina segura e simples para acompanhar toda a jornada da
paciente: cadastro, anamnese, agendamento, orçamento, atendimento, evolução,
sessões, fotos, documentos, assinaturas, consumo de estoque e registros
financeiros. O resultado esperado é reduzir papel e retrabalho sem perder
isolamento entre clínicas nem rastreabilidade clínica mínima.

## Pessoas e contexto de uso

- **Profissional da clínica:** consulta agenda, pacientes e prontuário; registra
  atendimento, evolução, fotos, documentos e consumo de materiais.
- **Administrador da clínica (`clinic_admin`):** além da operação clínica,
  gerencia equipe, configurações, modelos, integrações e financeiro do tenant.
- **Agente (`agent`):** opera dentro do tenant conforme as permissões de agenda
  e prontuário observadas no código.
- **Superadministrador da plataforma (`owner` ou
  `platform_super_admin` sem tenant):** administra clínicas e usuários na área
  `/plataforma`, sem entrar implicitamente na operação clínica.
- **Paciente:** participa dos fluxos interativos de anamnese, evolução,
  contrato e assinatura, normalmente em desktop ou tablet na clínica.

## Capacidades principais

- Autenticação, perfis e separação de acesso entre plataforma e clínica.
- Cadastro e histórico longitudinal da paciente.
- Agenda clínica com múltiplos procedimentos e sincronização Google Calendar.
- Templates e submissões digitais de anamnese, evolução e contratos.
- Biblioteca privada de fotos clínicas, miniaturas e vínculo com evoluções.
- Orçamentos, compras de procedimentos, sessões e documentos relacionados.
- Produtos, procedimentos, composição de insumos e baixa atômica de estoque.
- Contas, categorias, lançamentos e relatórios financeiros por tenant.
- Tema e branding de documentos por clínica.
- Empacotamento Docker standalone com release semântica para `linux/amd64`.

## Limites

- O MVP não inclui gateway de pagamento, ERP financeiro completo, chat interno
  nem dashboards pesados.
- O face mapping organiza fotos, ângulos e marcações; não promete reconstrução
  3D automática nem substitui avaliação clínica.
- O envio de lembretes por WhatsApp descrito no backlog abre uma mensagem
  preparada; não há automação de disparo confirmada.
- Cloudflare R2 aparece na arquitetura desejada, mas o runtime observado ainda
  usa Supabase Storage no bucket privado `clinical`.
- A migração completa de Supabase Auth/SDK para Postgres e MinIO local está
  documentada como trabalho pendente, não como estado concluído.
- Retenção e expiração de dados clínicos ainda não têm política formalizada nas
  fontes inspecionadas.

## Contexto técnico

Aplicação Next.js 15 com App Router, React 19 e TypeScript estrito. Páginas e
layouts são Server Components por padrão; componentes interativos isolam
`"use client"`. Server Actions em `lib/` e Route Handlers em `app/api/` são
fronteiras públicas, responsáveis por validar payload, autenticar e autorizar o
tenant antes de efeitos colaterais.

O backend observado usa Supabase Auth, PostgREST e PostgreSQL no schema
multitenant `clinic`. O isolamento combina contexto de perfil, filtros
explícitos por `tenant_id` e RLS no banco. Operações privilegiadas usam
`service_role` somente no servidor. Fotos e documentos ficam em storage
privado, acessados por URLs temporárias ou endpoints autenticados.

O frontend usa Tailwind CSS, componentes React próprios, React Hook Form, Zod
e TanStack Query. O design segue tokens em `app/globals.css`,
`tailwind.config.ts` e `.interface-design/system.md`. O inventário técnico
detalhado fica em `.specsfy/STACK.md`, `.specsfy/DATABASE.md`,
`.specsfy/PACKAGES.md` e `INTERFACE.md`.
