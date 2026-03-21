# Workflow: status do sistema de design

Use quando o usuário pedir o estado atual do design system, "interface-design status", ou equivalente.

## O que mostrar

**Se `.interface-design/system.md` existir:**

Exibir um resumo estruturado:

- Nome/direção do projeto (se houver)
- Direction, Foundation, Depth
- Tokens (spacing, radius, cores)
- Padrões documentados (botão, card, etc.)
- Última atualização (se inferível do git ou mtime do arquivo)

**Se não existir `system.md`:**

Informar que não há design system salvo e sugerir:

1. Construir UI — o sistema pode ser estabelecido no fluxo normal da skill
2. Pedir extração de padrões — seguir o fluxo em `workflows/extract.md`

## Implementação

1. Ler `.interface-design/system.md`
2. Extrair direction, tokens e patterns
3. Formatar de forma legível
4. Se ausente, indicar próximos passos
