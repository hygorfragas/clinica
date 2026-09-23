# Regras do sistema

Estas regras complementam as instruções dos agentes sem substituir specs ou
critérios de aceite. Modelo inicial sugerido para **Next.js**.

Para Next.js, explicite App Router, Server Components, Client Components e fronteiras entre servidor e navegador.

## Arquitetura

- Manter o Next.js App Router com Server Components por padrão e restringir Client Components às folhas que exigem interação ou APIs do navegador.

- Organizar a aplicação por domínio e manter regras de negócio fora dos componentes de tela.

## Código e qualidade

- Usar TypeScript estrito, evitar any sem justificativa e validar entradas externas com schemas Zod.

- Executar npm run typecheck sempre que um arquivo do projeto for alterado.

- Fazer commit focado e versionamento quando a entrega exigir registro no Git, sem incluir mudanças preexistentes ou segredos.

## Testes

- Exigir typecheck limpo antes de release ou criação de Pull Request e executar testes básicos proporcionais à mudança.

## Segurança e privacidade

- Toda entidade de domínio da clínica deve considerar tenant_id, índice de tenant e política RLS explícita; filtro no cliente ou na query não substitui RLS.

- Manter service role, segredos e credenciais somente no servidor e nunca expor valores sensíveis no bundle, no repositório ou nos logs.

- Manter fotos, anamneses, evoluções, contratos e assinaturas em storage privado com URLs assinadas e princípio do menor acesso.

- Registrar auditoria mínima para ações clínicas críticas e não persistir dados clínicos sensíveis no localStorage.

## Operação

- Publicar releases Docker como hygorfragas/clinica:X.Y.Z por npm run docker:push -- X.Y.Z, usando buildx para linux/amd64; latest nunca é a única ou primeira tag.

- Ao criar Pull Request, seguir a pipeline de typecheck, bump semver, commit, push, publicação Docker linux/amd64 e gh pr create.

- Aplicar o fluxo de status, timer, comentário e roadmap do ClickUp somente quando houver task do ClickUp explicitamente vinculada.

## Regras específicas do projeto

- Na agenda, evitar eventos duplicados no Google Calendar, persistir external_event_id e tratar remarcação, cancelamento e ressincronização.

- Em uploads clínicos, validar tipo e tamanho, normalizar nomes e separar os objetos por tenant e paciente.
