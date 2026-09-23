# Arquitetura

<!-- specsfy:documentator:start -->
## Componentes

| Tipo | Quantidade |
| --- | --- |
| Código | 1369 |
| Testes | 0 |

## Diagramas

```mermaid
flowchart TD
  Application[Aplicação]
```

```mermaid
classDiagram
  class Application
```
<!-- specsfy:documentator:end -->

## Complemento auditado

O produto é um monólito modular Next.js. O App Router coordena páginas e
layouts; componentes de domínio implementam interação; Server Actions e Route
Handlers acessam Supabase e integrações externas. O tenant é resolvido pelo
perfil autenticado e reaplicado em queries, storage paths e RLS.

```mermaid
flowchart LR
  U[Profissional no navegador] --> M[Middleware de sessão]
  M --> R[Next.js App Router]
  R --> SC[Server Components]
  R --> CC[Client Components]
  SC --> SA[Server Actions]
  CC --> SA
  CC --> API[Route Handlers]
  SA --> AUTH[Supabase Auth]
  API --> AUTH
  SA --> DB[(PostgreSQL schema clinic)]
  API --> DB
  SA --> ST[Supabase Storage privado]
  API --> ST
  API --> GC[Google Calendar API]
```

```mermaid
classDiagram
  class AppRouter
  class ComponentesDominio
  class ServerActions
  class RouteHandlers
  class Supabase
  class GoogleCalendar
  AppRouter --> ComponentesDominio
  ComponentesDominio --> ServerActions
  ComponentesDominio --> RouteHandlers
  ServerActions --> Supabase
  RouteHandlers --> Supabase
  RouteHandlers --> GoogleCalendar
```

O build é `standalone`, empacotado em imagem Docker multi-stage. Releases usam
`hygorfragas/clinica:<semver>` para `linux/amd64`.
