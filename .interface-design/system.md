# Sistema agenda clínica — design tokens

## Intenção

Calma operacional para estética: papel quente, verde-sálvia de confiança, leitura longa confortável, hierarquia suave (skill interface-design: bordas discretas, sombra leve).

## Profundidade

- Estratégia: sombra suave (`--shadow-lift`) + bordas em `rgba` baixa opacidade.
- Sidebar alinhada ao canvas com separador fino (não bloco de cor diferente).

## Espaçamento

- Base 4px; seções confortáveis (`p-6`, `gap-4`).

## Tokens (ver `app/globals.css`)

- `--canvas`, `--surface`, `--muted`, `--foreground` (+ muted/subtle), `--border`, `--brand`, `--brand-soft`, `--destructive`, `--ring`.

## Tipografia

- DM Sans (`next/font/google`), pesos médios para títulos curtos.

## Componentes recorrentes

- `Card` + `Button` variants (`primary`, `secondary`, `ghost`).
- Form: `Input` inset (fundo levemente mais escuro que surface).
