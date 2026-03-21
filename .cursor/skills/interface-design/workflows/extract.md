# Workflow: extrair padrões do código

Use quando o usuário pedir para gerar ou atualizar o design system a partir do código existente ("extract", "documentar padrões do projeto", etc.). Caminho opcional.

## O que extrair

Em arquivos de UI (tsx, jsx, vue, svelte, etc.):

1. Valores de spacing recorrentes → propor base e escala
2. Border radius recorrentes → escala de radius
3. Padrões de botão (altura, padding)
4. Padrões de card (borda, padding)
5. Estratégia de profundidade (bordas vs. sombras — por frequência)

Depois, apresentar um resumo e perguntar se deve gravar em `.interface-design/system.md` (permitir ajustes antes de salvar).

## Implementação

1. Localizar arquivos relevantes (glob / caminho informado)
2. Agregar valores e padrões por frequência
3. Propor texto inicial para `system.md`
4. Salvar só com confirmação explícita do usuário
