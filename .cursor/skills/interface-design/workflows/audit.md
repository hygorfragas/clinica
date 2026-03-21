# Workflow: auditoria contra o design system

Use quando o usuário pedir auditoria de código, "interface-design audit", checagem contra tokens/padrões, ou equivalente. O usuário pode informar um caminho (`src/components`, arquivo, etc.).

## O que verificar

**Se `.interface-design/system.md` existir:**

1. **Spacing** — valores fora da grade definida
2. **Depth** — sombras vs. bordas conforme a estratégia declarada
3. **Cores** — fora da paleta documentada (quando houver)
4. **Deriva de padrões** — botões/cards que não batem com o que está em `system.md`

Formato sugerido do relatório: lista de violações com arquivo, linha (se possível), valor encontrado vs. esperado, e sugestões objetivas.

**Se não existir `system.md`:**

Explicar que não há sistema para auditar contra; sugerir construir UI ou seguir `workflows/extract.md`.

## Implementação

1. Confirmar existência de `system.md`
2. Interpretar regras do sistema
3. Ler arquivos alvo (tsx, jsx, css, scss, etc.)
4. Comparar e reportar
