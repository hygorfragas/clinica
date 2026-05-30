# AGENTS.md

## Objetivo do produto
Construir um sistema SaaS multitenant para clínica de estética, focado em agenda, cadastro de pacientes, anamnese digital, ficha de evolução, orçamentos, controle de sessões, documentos com assinatura digital, fotos clínicas e controle básico de estoque.

## Resultado esperado do MVP
Entregar um produto web seguro, simples e operacional para uso diário de uma profissional de estética, substituindo processos manuais e centralizando toda a jornada da paciente.

## Prioridades absolutas
1. Multi-tenant desde o início.
2. Segurança e isolamento de dados por tenant.
3. UX simples para operação por uma profissional.
4. Modelagem correta da jornada da paciente.
5. Código limpo, tipado, testável e fácil de evoluir.
6. Rodar typecheck sempre que alterar um arquivo
7. Sempre fazer um commit quando necessario e criar versionamento.
8. **Docker Hub:** imagem `hygorfragas/clinica`; ao buildar release, publicar **primeiro** com tag semver (`:X.Y.Z`), nunca só `:latest` como primeira tag — ver `.cursor/rules/10-docker-image-versioning.mdc`.

## Stack base
- Frontend: Next.js + React + TypeScript
- UI: Tailwind + shadcn/ui
- Forms: React Hook Form + Zod
- Estado e dados: TanStack Query + Zustand
- Backend: Supabase (Postgres, Auth, Realtime, Edge Functions)
- Storage: Cloudflare R2
- Integrações: Google Calendar
- Visual clínico: React Konva para face mapping

## Regras globais
- Nunca gerar código sem considerar tenant_id e RLS.
- Nunca acessar tabelas sem política explícita de segurança.
- Nunca sugerir armazenamento sensível no cliente sem necessidade.
- Sempre preferir TypeScript estrito e schemas com Zod.
- Sempre propor migrações e contratos de dados claros.
- Sempre considerar auditoria mínima para ações clínicas críticas.
- Em features com arquivos, pensar em R2 + signed URLs.
- Em agenda, considerar sincronização com Google Calendar.
- Em prontuário/fotos/documentos, priorizar privacidade.

## Fluxo principal do negócio
1. Recepção ou busca da paciente
2. Cadastro mínimo ou completo
3. Anamnese digital
4. Agendamento
5. Orçamento/protocolo
6. Atendimento e evolução
7. Sessões/retornos
8. Fotos, documentos e assinaturas
9. Controle de estoque vinculado ao consumo

## Planejamento e ClickUp
- Roadmap e controle do plano: `documentacao/roadmap_e_plano_clickup.md` (manter atualizado com o ClickUp).
- Fluxo por task: regra `.cursor/rules/08-clickup-roadmap-sincronia.mdc` (status **Fazendo** / **Complete** / **Revisar**, timer ao iniciar/parar, comentário de relatório).

## Como responder neste projeto
- Primeiro confirmar entendimento da tarefa.
- Depois propor plano curto.
- Só então sugerir implementação.
- Em mudanças estruturais, listar impacto em banco, API, UI e segurança.
- Em código, preferir exemplos já prontos para produção.
