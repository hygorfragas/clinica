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

## Tipografia (oficial do projeto)

- **DM Sans** ([Google Fonts](https://fonts.google.com/specimen/DM+Sans)), via `next/font/google` em `app/layout.tsx`.
- Variável `--font-sans`; pesos médios em títulos, corpo legível para uso prolongado.
- Regra Cursor: `.cursor/rules/09-typography-and-theme.mdc`.

## Componentes recorrentes

- `Card` + `Button` variants (`primary`, `secondary`, `ghost`).
- Form: `Input` inset (fundo levemente mais escuro que surface).
