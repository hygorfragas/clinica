# Fluxos

<!-- specsfy:documentator:start -->
## Fluxo principal

```mermaid
flowchart LR
  Entrada --> Aplicação --> Saída
```

```mermaid
sequenceDiagram
  participant Cliente
  participant Aplicação
  Cliente->>Aplicação: requisição
```
<!-- specsfy:documentator:end -->

## Complemento auditado

```mermaid
flowchart LR
  A[Buscar ou cadastrar paciente] --> B[Registrar anamnese]
  B --> C[Agendar atendimento]
  C --> D[Criar orçamento ou protocolo]
  D --> E[Realizar atendimento]
  E --> F[Registrar evolução e sessão]
  F --> G[Anexar fotos documentos e assinaturas]
  G --> H[Baixar estoque e registrar financeiro]
```

```mermaid
sequenceDiagram
  actor P as Profissional
  participant UI as Next.js
  participant AUTH as Supabase Auth
  participant DB as PostgreSQL e RLS
  participant ST as Storage privado
  P->>UI: executa ação clínica
  UI->>AUTH: valida sessão
  AUTH-->>UI: user id
  UI->>DB: resolve profile e tenant
  DB-->>UI: perfil autorizado
  UI->>DB: grava linha com tenant id
  DB-->>UI: policy aceita ou nega
  opt arquivo clínico
    UI->>ST: grava no path do tenant
    ST-->>UI: chave privada
  end
  UI-->>P: sucesso ou erro recuperável
```
