# Especificação integrada: Documentos da avaliação no cadastro da paciente

| Campo | Valor |
| --- | --- |
| Formato | Specsfy/2.0 |
| ID | SPEC-0001 |
| Slug | 0001-documentos-da-avaliacao-no-cadastro-da-paciente |
| Status | Implementing |
| Effort | 3 |
| Effort updated at | 2026-09-23 |
| Effort rationale | Seção nova na ficha, página com vários tipos de conteúdo, versões e arquivo baixado. A descoberta de produto e de interface já foi feita. |
| ClickUp Task | |
| Milestones | |
| Definition Gate | Passed |
| Plan Gate | Passed |
| Delivery Gate | In Progress |
| Evidence Contract | 1 |
| Interface para pessoas | Sim |
| Atualizada em | 2026-09-23 |

## Ato I — Definir

### 1. Problema e resultado

#### Problema

Durante a avaliação, a profissional anota o que a paciente fala e precisa guardar isso num documento da paciente, para salvar, imprimir ou encaminhar, com o valor do protocolo quando ele existir, sem o preço de cada procedimento.

#### Resultado desejado

Na ficha da paciente, a profissional responsável abre a seção Documentos, escreve o relatório na página, salva, imprime a página como está vendo e baixa um arquivo para enviar por fora do sistema.

#### Métricas de sucesso

- A profissional responsável conclui, numa paciente sem documentos, abrir a seção e encontrar a página em branco pronta para escrever.
- Um arquivo baixado contém o texto da página e, somente se estiver preenchido, o valor do protocolo.
- Uma pessoa da clínica que não é a profissional responsável não vê a seção Documentos.

### 2. Research e esclarecimentos

#### Researchs executados

- **R-001**: Onde a ficha da paciente já separa seções → a navegação atual está em `components/clients/paciente-ficha-nav.tsx`, com Resumo, Anamnese, Evolução, Contratos, Financeiro, Anexos, Fotos e Histórico. Impacto: Documentos entra nesse mesmo grupo, e Anexos permanece.

#### Fontes e contexto consultados

- `specs/inbox/2026-09-22-225338-aba-de-documentos-no-cadastro-da-paciente.md`
- `specs/backlog/0001-documentos-da-avaliacao-no-cadastro-da-paciente.md`
- `.specsfy/DATABASE.md`
- `components/clients/paciente-ficha-nav.tsx`
- `app/(dashboard)/pacientes/[clientId]/page.tsx`
- `app/(dashboard)/pacientes/[clientId]/contratos/page.tsx`
- `app/(dashboard)/pacientes/[clientId]/anexos/page.tsx`

#### Documentação consultada

- `.specsfy/templates/Spec.md`, em 2026-09-23, estrutura da spec.
- `.specsfy/DATABASE.md`, informações confirmadas na conversa de 2026-09-23.
- `.agents/skills/specsfy-specialist-ui-design/SKILL.md` e `.agents/skills/specsfy-specialist-reui/SKILL.md`, composição e base React/Tailwind já instaladas.

#### Artefatos de pesquisa armazenados

- Nenhum artefato externo. Não houve consulta a API ou documentação fora do repositório que exigisse cópia em `research/`.

#### Dúvidas respondidas

- **Q**: O que entra nesta entrega? → **A**: criar, escrever texto, tabela, lista de verificação e subpágina, anexar, gravar áudio, informar o valor do protocolo, salvar com versão, listar, imprimir e baixar o arquivo. Escrever com IA e escrita simultânea ficam fora.
- **Q**: O que o arquivo leva? → **A**: o texto e, se estiver preenchido, o valor do protocolo. Áudio, anexos, tabela, lista de verificação e subpágina ficam no documento.
- **Q**: Como a paciente recebe o arquivo? → **A**: a profissional baixa e envia por fora. O sistema guarda uma cópia de cada envio, ligada ao documento e à paciente.
- **Q**: Onde ficam título e valor? → **A**: na própria página, junto com o texto, sem tela anterior.
- **Q**: Onde ficam as ações? → **A**: no computador, num painel lateral que não cobre o texto. No celular, no alto da página.

#### Dúvidas abertas

- Como a tela se comporta em carregando, erro de salvar e erro de baixar.
- Atalhos de teclado e ordem de foco além do uso básico da página.
- Filtros da lista, quando já existem documentos.
- O script `test:tdd` ainda não está em `package.json`. O runner escolhido é o Node test runner nativo.

### 3. Escopo e atores

#### Incluído

- Seção Documentos na ficha da paciente.
- Página do documento com título, valor do protocolo, texto, tabela, lista de verificação, subpágina, anexos e áudio.
- Lista com data de criação e título quando já existem documentos.
- Versão anterior a cada salvamento de alteração.
- Impressão da página como a profissional está vendo.
- Download do arquivo e cópia guardada de cada encaminhamento.

#### Fora de escopo

- Escrever com IA.
- Escrita ao mesmo tempo por mais de uma pessoa.
- Envio do arquivo pelo sistema, por e-mail ou por link.
- Cópia do documento dentro do contrato.
- Ligação do documento a um orçamento.
- Preço de cada procedimento no arquivo encaminhado.
- Prazo automático para apagar documento ou cópias.

#### Atores

- **Profissional responsável**: vê, cria, altera, imprime, baixa e apaga o documento, as versões, os anexos e o áudio da paciente.
- **Outra pessoa da clínica**: não vê a seção Documentos na ficha.
- **Paciente**: não abre o documento no sistema. Fica com cada arquivo que a profissional enviar por fora.

### 4. Princípios e restrições do projeto

- **PR-001**: Toda informação deste documento permanece isolada por clínica e só aparece para a profissional responsável daquela paciente.
- **PR-002**: A seção nova segue a navegação já existente da ficha, em páginas próprias, sem substituir Anexos, Contratos ou Orçamentos.
- **PR-003**: O arquivo encaminhado não é o mesmo conteúdo da página. A página guarda o trabalho da profissional. O arquivo leva o texto e, quando houver, o valor do protocolo.

### 5. Histórias de usuário

#### US-001 — Escrever o documento da avaliação (P1)

Como profissional responsável, quero abrir Documentos e escrever o relatório na página, para guardar a avaliação da paciente.

**Por que P1**: sem a página e a lista, a entrega não existe.
**Teste independente**: abrir uma paciente sem documentos, escrever e salvar, e ver o item na lista depois.
**Requisitos**: FR-001, FR-002, FR-004

#### US-002 — Encaminhar o relatório (P1)

Como profissional responsável, quero baixar um arquivo do documento e guardar cada envio, para a paciente receber o texto e o valor do protocolo sem o restante da página.

**Por que P1**: o áudio pediu salvar, imprimir ou encaminhar, e o arquivo é o que sai da clínica.
**Teste independente**: baixar duas vezes e conferir que cada cópia fica ligada à paciente, sem áudio nem preço por procedimento.
**Requisitos**: FR-003, FR-005

### 6. Cenários BDD de aceite

#### AC-001 — Primeira abertura mostra a página em branco

**Cobre**: US-001, FR-001, NFR-001

```gherkin
@US-001 @FR-001 @NFR-001 @AC-001
Feature: Abrir Documentos sem documento salvo

  Scenario: A profissional responsável encontra a página pronta para escrever
    Given a profissional responsável abre a ficha de uma paciente sem documentos
    When ela entra na seção Documentos
    Then a página em branco já está aberta
    And ela pode escrever o título, o valor do protocolo e o texto nessa página
```

#### AC-002 — Lista com data de criação e título

**Cobre**: US-001, FR-001

```gherkin
@US-001 @FR-001 @AC-002
Feature: Listar documentos já salvos

  Scenario: A lista identifica cada documento pela criação e pelo título
    Given a paciente já tem dois documentos salvos em dias diferentes
    When a profissional responsável abre a seção Documentos
    Then a lista mostra a data de criação e o título de cada documento
    And a data de criação não muda se ela alterar o texto depois
```

#### AC-003 — Outra pessoa da clínica não vê a seção

**Cobre**: US-001, FR-001, NFR-001

```gherkin
@US-001 @FR-001 @NFR-001 @AC-003
Feature: Esconder Documentos de quem não é a responsável

  Scenario: A seção não entra na ficha para outra pessoa da clínica
    Given uma pessoa da clínica que não é a profissional responsável abre a ficha
    When a navegação da ficha é exibida
    Then a seção Documentos não aparece
```

#### AC-004 — Salvar guarda a versão anterior

**Cobre**: US-001, FR-002

```gherkin
@US-001 @FR-002 @AC-004
Feature: Versionar a cada salvamento

  Scenario: Uma alteração salva conserva o estado anterior
    Given a profissional responsável já salvou um documento com texto
    When ela altera o texto e salva de novo
    Then o estado anterior fica guardado como versão
    And ela pode consultar, alterar e apagar essa versão como a versão atual
```

#### AC-005 — Salvar sem título mostra Sem título

**Cobre**: US-001, FR-002

```gherkin
@US-001 @FR-002 @AC-005
Feature: Salvar documento sem título

  Scenario: A lista usa um nome provisório
    Given a profissional responsável está na página em branco
    When ela salva sem escrever título
    Then o documento fica salvo
    And a lista mostra Sem título até ela escrever um título
```

#### AC-006 — Salvar sem valor do protocolo

**Cobre**: US-001, FR-002

```gherkin
@US-001 @FR-002 @AC-006
Feature: Salvar antes de informar o valor

  Scenario: A página pode ser guardada sem valor de protocolo
    Given a profissional responsável escreveu o texto e não informou o valor
    When ela salva
    Then o documento fica salvo sem valor de protocolo
```

#### AC-007 — Arquivo baixado leva texto e valor, e deixa o restante na página

**Cobre**: US-002, FR-003, NFR-001

```gherkin
@US-002 @FR-003 @NFR-001 @AC-007
Feature: Baixar o arquivo do documento

  Scenario: O arquivo não leva áudio, anexos nem blocos da página
    Given o documento tem texto, valor do protocolo, áudio, anexo, tabela, lista de verificação e subpágina
    When a profissional responsável baixa o arquivo
    Then o arquivo contém o texto e o valor do protocolo
    And o arquivo não contém o áudio, o anexo, a tabela, a lista de verificação nem a subpágina
    And o sistema guarda essa cópia ligada ao documento e à paciente
```

#### AC-008 — Baixar sem valor sai só com o texto

**Cobre**: US-002, FR-003

```gherkin
@US-002 @FR-003 @AC-008
Feature: Baixar sem valor de protocolo

  Scenario: O arquivo segue o que está preenchido
    Given o documento tem texto e não tem valor de protocolo
    When a profissional responsável baixa o arquivo
    Then o arquivo contém o texto
    And o arquivo não contém valor de protocolo
```

#### AC-009 — Cada encaminhamento guarda a própria cópia

**Cobre**: US-002, FR-003

```gherkin
@US-002 @FR-003 @AC-009
Feature: Guardar cada envio

  Scenario: Dois downloads não se substituem
    Given a profissional responsável já baixou um arquivo desse documento
    When ela baixa de novo depois de alterar o texto
    Then as duas cópias permanecem
    And cada cópia fica ligada ao documento e à paciente
```

#### AC-010 — Imprimir mostra a página como ela está vendo

**Cobre**: US-001, FR-004

```gherkin
@US-001 @FR-004 @AC-010
Feature: Imprimir o documento

  Scenario: A impressão acompanha a página aberta
    Given a profissional responsável está vendo a página com texto, tabela e áudio
    When ela imprime
    Then a impressão mostra a página como ela está vendo
```

#### AC-011 — No computador as ações ficam no painel lateral

**Cobre**: US-001, FR-004

```gherkin
@US-001 @FR-004 @AC-011
Feature: Ações no computador

  Scenario: O painel lateral não cobre o texto
    Given a profissional responsável abre o documento no computador
    When ela abre salvar, imprimir, baixar, gravar áudio ou ver versões
    Then essas ações aparecem num painel lateral
    And o texto da página continua visível
```

#### AC-012 — No celular as ações ficam no alto da página

**Cobre**: US-001, FR-004

```gherkin
@US-001 @FR-004 @AC-012
Feature: Ações no celular

  Scenario: O painel lateral não é usado no celular
    Given a profissional responsável abre o documento no celular
    When a página é exibida
    Then salvar, imprimir, baixar, gravar áudio e ver versões ficam no alto da página
    And o painel lateral não é o lugar dessas ações
```

#### AC-013 — O preço de cada procedimento não entra no arquivo

**Cobre**: US-002, FR-005

```gherkin
@US-002 @FR-005 @AC-013
Feature: Separar orçamento e arquivo

  Scenario: O arquivo não desmembra o valor dos procedimentos
    Given a paciente tem um orçamento com preço por procedimento
    And o documento tem um valor de protocolo
    When a profissional responsável baixa o arquivo
    Then o arquivo contém o valor do protocolo
    And o arquivo não contém o preço de cada procedimento
    And o orçamento permanece independente do documento
```

#### AC-014 — O contrato não guarda cópia do documento

**Cobre**: US-002, FR-005

```gherkin
@US-002 @FR-005 @AC-014
Feature: Usar o documento na hora do contrato

  Scenario: O contrato não recebe uma cópia automática
    Given existe um documento salvo na paciente
    When a profissional responsável consulta os contratos dessa paciente
    Then o contrato não guarda uma cópia desse documento
    And o documento continua na seção Documentos
```

#### AC-015 — Apagar o documento apaga as cópias

**Cobre**: US-002, FR-005, NFR-002

```gherkin
@US-002 @FR-005 @NFR-002 @AC-015
Feature: Apagar documento e cópias

  Scenario: As cópias saem junto com o documento
    Given o documento tem duas cópias de arquivo encaminhado
    When a profissional responsável apaga o documento
    Then o documento deixa de aparecer
    And as duas cópias também saem
```

#### AC-016 — A paciente não abre o documento no sistema

**Cobre**: US-002, NFR-001

```gherkin
@US-002 @NFR-001 @AC-016
Feature: A paciente fica fora da ficha

  Scenario: O documento não tem abertura para a paciente
    Given a profissional responsável baixou o arquivo e enviou por fora
    When se observa o acesso da paciente ao sistema
    Then a paciente não abre o documento
    And ela fica com o arquivo que recebeu por fora
```

#### AC-017 — O áudio permanece só no documento

**Cobre**: US-002, FR-003, NFR-001

```gherkin
@US-002 @FR-003 @NFR-001 @AC-017
Feature: Áudio restrito à profissional

  Scenario: O áudio entra na versão e não no arquivo
    Given a profissional responsável gravou um áudio no documento e salvou
    When ela baixa o arquivo
    Then o áudio continua no documento e na versão daquele momento
    And o arquivo não contém o áudio
```

#### AC-018 — Sem prazo automático enquanto o documento existe

**Cobre**: US-002, NFR-002

```gherkin
@US-002 @NFR-002 @AC-018
Feature: Permanência sem prazo

  Scenario: O tempo sozinho não apaga o documento
    Given um documento salvo e uma cópia encaminhada
    When passa qualquer prazo sem a profissional apagar
    Then o documento e a cópia continuam disponíveis para a profissional responsável
```

#### AC-019 — Alterar o documento não inicia um prazo de exclusão

**Cobre**: US-001, NFR-002

```gherkin
@US-001 @NFR-002 @AC-019
Feature: Edição sem expiração

  Scenario: Salvar uma alteração não agenda a saída do documento
    Given um documento já salvo
    When a profissional responsável altera o texto e salva
    Then o documento permanece até ela apagar
    And nenhuma exclusão automática é marcada
```

### 7. Requisitos

#### Funcionais

- **FR-001**: O sistema deve mostrar a seção Documentos na ficha só para a profissional responsável. Sem documentos, a seção abre a página em branco. Com documentos, a lista mostra a data de criação e o título, ou Sem título enquanto o título não for escrito.
- **FR-002**: O sistema deve guardar, na mesma página, título, valor do protocolo, texto, tabela, lista de verificação, subpágina, anexos e áudio. Deve permitir salvar sem título e sem valor. Cada salvamento de uma alteração deve guardar o estado anterior como versão, que a profissional pode consultar, alterar e apagar.
- **FR-003**: O sistema deve deixar a profissional baixar um arquivo com o texto e, se estiver preenchido, o valor do protocolo. Áudio, anexos, tabela, lista de verificação e subpágina não entram nesse arquivo. Cada download guarda uma cópia ligada ao documento e à paciente.
- **FR-004**: O sistema deve imprimir a página como a profissional está vendo. No computador, salvar, imprimir, baixar, gravar áudio e ver versões ficam num painel lateral que não cobre o texto. No celular, essas ações ficam no alto da página.
- **FR-005**: O sistema deve manter orçamentos independentes do documento e não colocar o preço de cada procedimento no arquivo. O contrato não guarda cópia do documento. Apagar o documento também apaga as cópias encaminhadas.

#### Não funcionais

- **NFR-001**: Somente a profissional responsável consulta e altera o documento, as versões, os anexos e o áudio. A paciente não abre o documento no sistema. **Verificação**: inspeção da navegação da ficha e teste de acesso com outro perfil da clínica e sem sessão da paciente nesse documento.
- **NFR-002**: Documento e cópias permanecem enquanto a profissional não apagar o documento. Não há prazo automático. **Verificação**: teste de permanência após alteração e após tempo decorrido, e teste de exclusão conjunta ao apagar o documento.

#### Erros e casos-limite

- Salvar sem título → o documento salva e a lista mostra Sem título.
- Salvar ou baixar sem valor → a ação segue, e o arquivo sai sem valor de protocolo.
- Apagar o documento → as cópias encaminhadas saem junto.
- Outra pessoa da clínica abre a ficha → a seção Documentos não aparece.
- Carregando, falha ao salvar e falha ao baixar → comportamento ainda não decidido; não inventar mensagem nesta spec.

## Ato II — Projetar e provar

### 8. Plano técnico

#### Contexto existente

- Next.js App Router, React, TypeScript e Tailwind. A ficha da paciente usa seções em rotas sob `app/(dashboard)/pacientes/[clientId]/` e a navegação em `components/clients/paciente-ficha-nav.tsx`.
- Anexos, contratos e orçamentos já existem e não são substituídos por esta seção.
- O runner confirmado é o Node test runner nativo. O script `test:tdd` ainda será declarado em `package.json`.

#### Arquitetura e módulos

- A página da seção compõe a lista ou a página em branco e não concentra a regra do arquivo nem da versão.
- A regra do que entra no arquivo, da versão a cada salvamento e de quem vê a seção fica no servidor, com o isolamento da clínica já usado no cadastro da paciente.
- O áudio e os anexos seguem armazenamento privado, com acesso só da profissional responsável.

#### Fluxos e tratamento de erros

- Abrir Documentos sem itens mostra a página em branco.
- Abrir Documentos com itens mostra a lista e, a partir dela, a página do documento.
- Baixar gera o arquivo e a cópia. Enviar à paciente acontece fora do sistema.
- Falha de salvar e falha de baixar permanecem em dúvida aberta até uma rodada posterior.

#### Fronteiras e interfaces

- Não há API pública nova para a paciente.
- Não há chamada a OpenRouter, 9router nem escrita com IA nesta entrega.

#### Segurança, privacidade e compliance

- O conteúdo da página é dado clínico e comercial da paciente.
- O arquivo não leva áudio, anexos, tabela, lista de verificação, subpágina nem preço por procedimento.
- Logs não registram o texto clínico nem o áudio.

#### Performance, disponibilidade e observabilidade

- Não há meta numérica confirmada. A lista e a página devem abrir no fluxo normal da ficha.

#### Compatibilidade e rollout

- A navegação atual ganha o item Documentos sem remover os itens existentes.
- Não há migração de documentos antigos, porque a seção é nova.

### 9. Modelo de dados

O detalhe confirmado do que guardar está em `.specsfy/DATABASE.md`. Aqui fica o comportamento.

#### Entidades e relacionamentos

| Entidade | Identidade | Atributos e regras | Relações |
| --- | --- | --- | --- |
| Documento da avaliação | Um documento da paciente | Título opcional, data de criação fixa, valor do protocolo opcional, texto, tabela, lista de verificação, subpágina, anexos e áudio | Somente à paciente. Sem ligação a orçamento ou contrato |
| Versão anterior | O estado antes de um salvamento | Guarda texto, tabela, lista, subpágina, anexos, áudio e valor daquele momento | Pertence ao documento. Pode ser alterada e apagada como a atual |
| Cópia do arquivo | Um download | Texto e, se havia, o valor. Sem áudio, anexos, tabela, lista ou subpágina | Ligada ao documento e à paciente. Sai se o documento for apagado |

#### Estados e transições

| Entidade | Estado atual | Evento | Próximo estado | Invariantes |
| --- | --- | --- | --- | --- |
| Documento | Inexistente | Profissional abre Documentos sem itens | Página em branco | Só a responsável vê a seção |
| Documento | Página em edição | Salvar alteração | Versão anterior guardada e página atualizada | Data de criação não muda |
| Cópia | Inexistente | Baixar arquivo | Cópia ligada ao documento e à paciente | Conteúdo limitado ao texto e ao valor preenchido |
| Documento e cópias | Existentes | Apagar documento | Ambos saem | Sem prazo automático antes disso |

#### Migração e retenção

- Não há migração de dados anteriores.
- Retenção confirmada: permanecem até a profissional apagar o documento. Sem prazo automático.

### 10. Interfaces e contratos

#### Interface para pessoas

- **Há interface para pessoas**: Sim. A profissional responsável usa a seção Documentos na ficha.

#### Stack e convenções de interface

- Next.js App Router, React, TypeScript, Tailwind e a navegação já usada na ficha.
- Fonte e tokens do projeto permanecem os de `app/layout.tsx` e `app/globals.css`.
- shadcn/ui fornece primitives. ReUI fornece lista, formulário na página e painel lateral, sem desfazer as decisões de produto.
- Telas atuais preservadas: Resumo, Anamnese, Evolução, Contratos, Financeiro, Anexos, Fotos e Histórico.

#### Telas e responsabilidades

- Lista de documentos: a profissional responsável vê os documentos já salvos, com data de criação e título, e abre um deles ou cria outro.
- Página do documento: a profissional escreve título, valor e conteúdo, e usa as ações de salvar, imprimir, baixar, gravar áudio e ver versões.
- Quando não há documento, a lista não é a primeira tela: a página em branco abre direto.

#### Fluxo de informação e navegação

- A profissional entra pela ficha da paciente, no item Documentos.
- Sem documentos, cai na página em branco. Com documentos, vê a lista e abre a página.
- Título e valor são escritos nessa página. Salvar atualiza a lista e guarda a versão anterior.
- Baixar devolve o arquivo para ela enviar por fora. Imprimir usa a página visível.
- O rastro da tela é a ficha da paciente, a seção Documentos e, na página, o título do documento ou Sem título.

#### Menus e navegação principal

- O menu da ficha, em `components/clients/paciente-ficha-nav.tsx`, ganha o item Documentos.
- O destino é a seção da paciente, no mesmo grupo dos itens atuais.
- O item só é exibido para a profissional responsável.
- No celular, o item continua nesse menu da ficha. As ações do documento, essas sim, saem do painel e vão para o alto da página.

#### Formulários e ações

- Não há formulário anterior. Título, valor do protocolo e texto ficam na página.
- Título e valor são opcionais. Sem título, a lista mostra Sem título. Sem valor, salvar e baixar seguem.
- Ações: salvar, imprimir, baixar, gravar áudio e ver versões.
- No computador o padrão é painel lateral, sem cobrir o texto. No celular as ações ficam no alto da página.

#### Composição e disposição

- A página prioriza o texto. O painel lateral, no computador, fica ao lado, sem cobrir o texto.
- No celular, o texto ocupa a largura e as ações ficam no alto.
- A lista, quando existe, mostra data de criação e título, não uma grade técnica.
- Breadcrumb da ficha: clínica atual, paciente, Documentos e, na página, o título ou Sem título.

#### Blocos React e componentes selecionados

| Tela | Bloco React | Responsabilidade | Arquivo previsto | Componente ou composição | Origem | Reuso ou extensão |
| --- | --- | --- | --- | --- | --- | --- |
| Ficha | Item Documentos | Entrada da seção só para a responsável | `components/clients/paciente-ficha-nav.tsx` | Link da navegação atual | próprio | Estender a lista de itens existente |
| Lista | Lista de documentos | Mostrar data de criação e título | `components/clients/documentos-avaliacao-lista.tsx` | List | ReUI | Novo, porque a ficha ainda não tem esta lista |
| Página | Página do documento | Título, valor, texto e blocos da página | `components/clients/documento-avaliacao-pagina.tsx` | Form na própria página | ReUI e shadcn/ui | Novo |
| Página | Painel de ações | Salvar, imprimir, baixar, áudio e versões no computador | `components/clients/documento-avaliacao-acoes.tsx` | Sheet | ReUI | Novo. No celular o mesmo bloco rende as ações no alto |

- A página da rota apenas compõe esses blocos.
- Exceção registrada: não há passo de formulário antes da página, e a primeira abertura sem documentos não mostra a lista vazia.

#### Estados e acessibilidade

- Sem documentos: a página em branco abre, pronta para escrever.
- Com documentos: a lista mostra data de criação e título, ou Sem título.
- Permissão: a seção não aparece para quem não é a profissional responsável.
- Sucesso de salvar: o documento passa a existir na lista e a versão anterior fica disponível quando houve alteração.
- Carregando, erro de salvar, erro de baixar, foco e atalhos de teclado: ainda não decididos.
- O rastro da tela mantém a paciente e a seção, e marca a página atual.

#### Contrato CRUD

- As telas de lista e de página usam um PageHeader reutilizável, com o nome da seção e a ação de criar quando a lista está visível.
- A listagem não usa DataGrid com coluna de ID técnico. A exceção confirmada é a lista identificada pela data de criação e pelo título. A linha abre a página do documento.
- Editar acontece na própria página. Apagar o documento está disponível para a profissional responsável e remove também as cópias.
- O registro desses blocos em `INTERFACE.md` fica para a implementação, com os consumidores e os estados já decididos.

#### Revisão visual durante o desenvolvimento

- Durante a implementação, conferir bordas, espaçamentos, margens, padding e tipografia da ficha nos dois viewports: computador, com painel lateral, e celular, com ações no alto.
- Conferir também a página em branco, a lista com Sem título e a página com texto.
- O achado e o ajuste entram na evidência da tarefa de interface.

#### APIs expostas

- Operações autenticadas da profissional responsável, no servidor da ficha: abrir a seção, salvar a página, listar, baixar o arquivo, imprimir a página visível e apagar o documento.
- Não há rota pública para a paciente abrir o documento.

#### APIs externas utilizadas

- Nenhuma nesta entrega.

#### Documentação das APIs consultadas

- Nenhuma documentação externa de API foi consultada para este comportamento.

#### Eventos e outros contratos

- Não aplicável. O envio à paciente ocorre fora do sistema.

### 11. Estratégia TDD

- **Unidade**: regra do arquivo, versão a cada salvamento e ocultação da seção.
- **Integração/contrato**: salvar, listar, baixar e apagar no fluxo da ficha, com isolamento da clínica.
- **BDD/aceite**: os cenários da seção 6 orientam os testes, sem arquivo `.feature` separado.
- **Runner TDD**: Node test runner nativo, com o script `test:tdd` em `package.json`. A pessoa escolheu essa opção em 2026-09-23. O script ainda será declarado na tarefa de preparação.
- **E2E**: a jornada de abrir a página em branco, salvar e baixar, quando o runner de ponta a ponta existir.
- **Verificação manual**: impressão da página como vista, porque o resultado impresso depende do navegador.

#### Evidência RED-GREEN-REFACTOR

| IDs | BDD de referência | Teste TDD informado pelo BDD | RED observado | GREEN observado | Refactor/regressão |
| --- | --- | --- | --- | --- | --- |
| US-001, FR-001, NFR-001, AC-001 | AC-001 na seção 6 | tests/documentos-avaliacao/ac-001.test.ts | npm run test:tdd em 2026-09-23 falhou com Error: comportamento ausente | Pending | Pending |
| US-001, FR-002, AC-004 | AC-004 na seção 6 | tests/documentos-avaliacao/ac-004.test.ts | npm run test:tdd em 2026-09-23 falhou com Error: comportamento ausente | Pending | Pending |
| US-002, FR-003, NFR-001, AC-007 | AC-007 na seção 6 | tests/documentos-avaliacao/ac-007.test.ts | npm run test:tdd em 2026-09-23 falhou com Error: comportamento ausente | Pending | Pending |

### 12. Plano de testes e rastreabilidade

| Requisito | Cenário BDD | Nível | Arquivo/comando esperado | Evidência |
| --- | --- | --- | --- | --- |
| FR-001 | AC-001 | Unidade | npm run test:tdd -- tests/documentos-avaliacao/ac-001.test.ts | RED em 2026-09-23: Error: comportamento ausente |
| FR-001 | AC-002 | Integração | Teste da lista com data de criação e título | RED em 2026-09-23: Error: comportamento ausente |
| FR-001 | AC-003 | Integração | Teste da navegação sem o item para outro perfil | RED em 2026-09-23: Error: comportamento ausente |
| FR-002 | AC-004 | Unidade | Teste da versão anterior ao salvar | RED em 2026-09-23: Error: comportamento ausente |
| FR-002 | AC-005 | Unidade | Teste de salvar sem título | RED em 2026-09-23: Error: comportamento ausente |
| FR-002 | AC-006 | Unidade | Teste de salvar sem valor | RED em 2026-09-23: Error: comportamento ausente |
| FR-003 | AC-007 | Unidade | Teste do conteúdo do arquivo | RED em 2026-09-23: Error: comportamento ausente |
| FR-003 | AC-008 | Unidade | Teste do arquivo sem valor | RED em 2026-09-23: Error: comportamento ausente |
| FR-003 | AC-009 | Integração | Teste de duas cópias | RED em 2026-09-23: Error: comportamento ausente |
| FR-004 | AC-010 | Verificação manual | Impressão da página visível | RED em 2026-09-23: Error: comportamento ausente |
| FR-004 | AC-011 | Integração | Teste do painel no computador | RED em 2026-09-23: Error: comportamento ausente |
| FR-004 | AC-012 | Integração | Teste das ações no alto no celular | RED em 2026-09-23: Error: comportamento ausente |
| FR-005 | AC-013 | Unidade | Teste da ausência do preço por procedimento | RED em 2026-09-23: Error: comportamento ausente |
| FR-005 | AC-014 | Integração | Teste de contrato sem cópia do documento | RED em 2026-09-23: Error: comportamento ausente |
| FR-005 | AC-015 | Integração | Teste de apagar documento e cópias | RED em 2026-09-23: Error: comportamento ausente |
| NFR-001 | AC-003 | Integração | Navegação oculta | RED em 2026-09-23: Error: comportamento ausente |
| NFR-001 | AC-016 | Integração | Paciente sem abertura do documento | RED em 2026-09-23: Error: comportamento ausente |
| NFR-001 | AC-017 | Unidade | Áudio fora do arquivo | RED em 2026-09-23: Error: comportamento ausente |
| NFR-002 | AC-015 | Integração | Exclusão conjunta | RED em 2026-09-23: Error: comportamento ausente |
| NFR-002 | AC-018 | Unidade | Permanência sem prazo | RED em 2026-09-23: Error: comportamento ausente |
| NFR-002 | AC-019 | Unidade | Edição sem expiração | RED em 2026-09-23: Error: comportamento ausente |

### 13. Validações

#### Gate do Ato I — Definição

- **Resultado**: Passed
- **Data**: 2026-09-23
- **Comando**: `node .agents/skills/specsfy-04-validate/scripts/validate_spec.mjs specs/planned/0001-documentos-da-avaliacao-no-cadastro-da-paciente/spec.md`
- **Achados**: READY. O formato Specsfy/2.0 passou na validação estrita. Cada US, FR e NFR aparece em pelo menos três AC. Não há P1 aberto. Os pontos abaixo não impedem planejar o caminho já decidido.

- **FIND-PROD-001** [P2] [Open] Carregando, erro ao salvar e erro ao baixar ainda não têm comportamento observável — Refs: FR-002, FR-003, AC-006 — Evidence: in-progress/0001-documentos-da-avaliacao-no-cadastro-da-paciente/spec.md:75 — Effect: a implementação pode inventar a mensagem dessas falhas — Suggestion: decidir o texto e o estado numa rodada futura, sem reabrir o caminho feliz já coberto
- **FIND-ARCH-001** [P2] [Accepted] O runner confirmado é o Node test runner nativo e o script test:tdd entra na tarefa de preparação — Refs: US-001, FR-001, AC-001 — Evidence: in-progress/0001-documentos-da-avaliacao-no-cadastro-da-paciente/spec.md:75 — Effect: os testes deixam de depender de Vitest — Suggestion: declarar o script em package.json antes dos casos RED
- **FIND-SEC-001** [P2] [Open] O acesso só da profissional responsável e a permanência até ela apagar ainda não estão em RULES.md — Refs: NFR-001, NFR-002, AC-003 — Evidence: in-progress/0001-documentos-da-avaliacao-no-cadastro-da-paciente/spec.md:75 — Effect: a regra confirmada pode ficar só na spec — Suggestion: registrar as duas regras em .specsfy/RULES.md durante a implementação, como pede a Definition of Done

#### Gate do Ato II — Plano

- **Resultado**: Passed
- **Data**: 2026-09-23
- **Comando**: `node .agents/skills/specsfy-05-tasks/scripts/validate_tasks.mjs specs/planned/0001-documentos-da-avaliacao-no-cadastro-da-paciente/spec.md`
- **Achados**: READY. 19 predecessores TDD concluídos em RED com `Error: comportamento ausente` via `npm run test:tdd`. A migration e o código de produção seguem abertos. O script de teste e os módulos ainda sem comportamento não alteram `PROJECT.md` nem `.specsfy/RULES.md`; essas revisões permanecem em T032 e T034.

#### Gate do Ato III — Entrega

- **Resultado**: Pending
- **Comando**: `node .agents/skills/specsfy-06-tdd-bdd/scripts/check_traceability.mjs specs/planned/0001-documentos-da-avaliacao-no-cadastro-da-paciente/spec.md .`
- **Achados**: Pending.

### 14. Tarefas

#### Fase 1 — Preparação do runner

- [x] T001 [OPS] [US-001] Declarar o script test:tdd com o Node test runner nativo em package.json — Refs: US-001, FR-001, AC-001 — Depends: none
  - [x] **PREP**: Confirmar DEC-008: o runner é o Node test runner nativo e o script se chama test:tdd.
  - [x] **EXECUTE**: Acrescentar em package.json o script test:tdd com `node --experimental-strip-types --test tests/documentos-avaliacao/*.test.ts`.
  - [x] **VERIFY**: Rodar `npm run test:tdd` e confirmar que o script existe, mesmo que ainda não haja casos.
  - [x] **VISUAL**: Não aplicável porque a tarefa só altera package.json, sem tela.
  - [x] **EVIDENCE**: O script rodou em 2026-09-23 com Node 26 e a flag strip-types. A saída está na seção 11.
  - [x] **IMPROVE**: A flag bastou no Node 26. O diretório sem glob quebrava o runner; o script ficou no padrão `*.test.ts`. `tests` saiu do typecheck da aplicação.

#### Fase 2 — RED TDD informado pelo BDD

- [x] T002 [P] [TEST] [TDD] [US-001] Derivar do AC-001 um caso RED do Node test runner em tests/documentos-avaliacao/ac-001.test.ts — Refs: US-001, FR-001, NFR-001, AC-001 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-001 na spec e confirmar que o caso prova: a primeira abertura da seção mostra a página em branco.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-001.test.ts com node:test, marcador SPECSFY: US-001 FR-001 NFR-001 AC-001, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-001.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente. IDs US-001, FR-001, NFR-001, AC-001.
  - [x] **IMPROVE**: O nome do teste já distingue a página em branco na primeira abertura. Nenhuma mudança extra.

- [x] T003 [P] [TEST] [TDD] [US-001] Derivar do AC-002 um caso RED do Node test runner em tests/documentos-avaliacao/ac-002.test.ts — Refs: US-001, FR-001, AC-002 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-002 na spec e confirmar que o caso prova: a lista mostra a data de criação e o título.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-002.test.ts com node:test, marcador SPECSFY:AC-002, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-002.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-002.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir a lista mostra a data de criação e o título; senão registrar que o caso já está específico.

- [x] T004 [P] [TEST] [TDD] [US-001] Derivar do AC-003 um caso RED do Node test runner em tests/documentos-avaliacao/ac-003.test.ts — Refs: US-001, FR-001, NFR-001, AC-003 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-003 na spec e confirmar que o caso prova: outra pessoa da clínica não vê a seção Documentos.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-003.test.ts com node:test, marcador SPECSFY:AC-003, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-003.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-003.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir outra pessoa da clínica não vê a seção Documentos; senão registrar que o caso já está específico.

- [x] T005 [P] [TEST] [TDD] [US-001] Derivar do AC-004 um caso RED do Node test runner em tests/documentos-avaliacao/ac-004.test.ts — Refs: US-001, FR-002, AC-004 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-004 na spec e confirmar que o caso prova: salvar uma alteração guarda a versão anterior.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-004.test.ts com node:test, marcador SPECSFY:AC-004, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-004.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-004.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir salvar uma alteração guarda a versão anterior; senão registrar que o caso já está específico.

- [x] T006 [P] [TEST] [TDD] [US-001] Derivar do AC-005 um caso RED do Node test runner em tests/documentos-avaliacao/ac-005.test.ts — Refs: US-001, FR-002, AC-005 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-005 na spec e confirmar que o caso prova: salvar sem título deixa a lista com Sem título.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-005.test.ts com node:test, marcador SPECSFY:AC-005, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-005.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-005.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir salvar sem título deixa a lista com Sem título; senão registrar que o caso já está específico.

- [x] T007 [P] [TEST] [TDD] [US-001] Derivar do AC-006 um caso RED do Node test runner em tests/documentos-avaliacao/ac-006.test.ts — Refs: US-001, FR-002, AC-006 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-006 na spec e confirmar que o caso prova: salvar sem valor de protocolo conclui e guarda o documento.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-006.test.ts com node:test, marcador SPECSFY:AC-006, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-006.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-006.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir salvar sem valor de protocolo conclui e guarda o documento; senão registrar que o caso já está específico.

- [x] T008 [P] [TEST] [TDD] [US-002] Derivar do AC-007 um caso RED do Node test runner em tests/documentos-avaliacao/ac-007.test.ts — Refs: US-002, FR-003, NFR-001, AC-007 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-007 na spec e confirmar que o caso prova: o arquivo leva texto e valor e deixa áudio, anexo e blocos de fora.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-007.test.ts com node:test, marcador SPECSFY:AC-007, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-007.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-007.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir o arquivo leva texto e valor e deixa áudio, anexo e blocos de fora; senão registrar que o caso já está específico.

- [x] T009 [P] [TEST] [TDD] [US-002] Derivar do AC-008 um caso RED do Node test runner em tests/documentos-avaliacao/ac-008.test.ts — Refs: US-002, FR-003, AC-008 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-008 na spec e confirmar que o caso prova: baixar sem valor gera arquivo só com o texto.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-008.test.ts com node:test, marcador SPECSFY:AC-008, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-008.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-008.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir baixar sem valor gera arquivo só com o texto; senão registrar que o caso já está específico.

- [x] T010 [P] [TEST] [TDD] [US-002] Derivar do AC-009 um caso RED do Node test runner em tests/documentos-avaliacao/ac-009.test.ts — Refs: US-002, FR-003, AC-009 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-009 na spec e confirmar que o caso prova: dois downloads guardam duas cópias ligadas à paciente.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-009.test.ts com node:test, marcador SPECSFY:AC-009, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-009.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-009.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir dois downloads guardam duas cópias ligadas à paciente; senão registrar que o caso já está específico.

- [x] T011 [P] [TEST] [TDD] [US-001] Derivar do AC-010 um caso RED do Node test runner em tests/documentos-avaliacao/ac-010.test.ts — Refs: US-001, FR-004, AC-010 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-010 na spec e confirmar que o caso prova: imprimir mostra a página como a profissional está vendo.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-010.test.ts com node:test, marcador SPECSFY:AC-010, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-010.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-010.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir imprimir mostra a página como a profissional está vendo; senão registrar que o caso já está específico.

- [x] T012 [P] [TEST] [TDD] [US-001] Derivar do AC-011 um caso RED do Node test runner em tests/documentos-avaliacao/ac-011.test.ts — Refs: US-001, FR-004, AC-011 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-011 na spec e confirmar que o caso prova: no computador as ações ficam no painel lateral sem cobrir o texto.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-011.test.ts com node:test, marcador SPECSFY:AC-011, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-011.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-011.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir no computador as ações ficam no painel lateral sem cobrir o texto; senão registrar que o caso já está específico.

- [x] T013 [P] [TEST] [TDD] [US-001] Derivar do AC-012 um caso RED do Node test runner em tests/documentos-avaliacao/ac-012.test.ts — Refs: US-001, FR-004, AC-012 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-012 na spec e confirmar que o caso prova: no celular as ações ficam no alto da página.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-012.test.ts com node:test, marcador SPECSFY:AC-012, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-012.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-012.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir no celular as ações ficam no alto da página; senão registrar que o caso já está específico.

- [x] T014 [P] [TEST] [TDD] [US-002] Derivar do AC-013 um caso RED do Node test runner em tests/documentos-avaliacao/ac-013.test.ts — Refs: US-002, FR-005, AC-013 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-013 na spec e confirmar que o caso prova: o arquivo não leva o preço de cada procedimento.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-013.test.ts com node:test, marcador SPECSFY:AC-013, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-013.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-013.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir o arquivo não leva o preço de cada procedimento; senão registrar que o caso já está específico.

- [x] T015 [P] [TEST] [TDD] [US-002] Derivar do AC-014 um caso RED do Node test runner em tests/documentos-avaliacao/ac-014.test.ts — Refs: US-002, FR-005, AC-014 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-014 na spec e confirmar que o caso prova: o contrato não guarda cópia do documento.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-014.test.ts com node:test, marcador SPECSFY:AC-014, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-014.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-014.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir o contrato não guarda cópia do documento; senão registrar que o caso já está específico.

- [x] T016 [P] [TEST] [TDD] [US-002] Derivar do AC-015 um caso RED do Node test runner em tests/documentos-avaliacao/ac-015.test.ts — Refs: US-002, FR-005, NFR-002, AC-015 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-015 na spec e confirmar que o caso prova: apagar o documento apaga as cópias encaminhadas.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-015.test.ts com node:test, marcador SPECSFY:AC-015, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-015.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-015.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir apagar o documento apaga as cópias encaminhadas; senão registrar que o caso já está específico.

- [x] T017 [P] [TEST] [TDD] [US-002] Derivar do AC-016 um caso RED do Node test runner em tests/documentos-avaliacao/ac-016.test.ts — Refs: US-002, NFR-001, AC-016 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-016 na spec e confirmar que o caso prova: a paciente não abre o documento no sistema.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-016.test.ts com node:test, marcador SPECSFY:AC-016, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-016.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-016.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir a paciente não abre o documento no sistema; senão registrar que o caso já está específico.

- [x] T018 [P] [TEST] [TDD] [US-002] Derivar do AC-017 um caso RED do Node test runner em tests/documentos-avaliacao/ac-017.test.ts — Refs: US-002, FR-003, NFR-001, AC-017 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-017 na spec e confirmar que o caso prova: o áudio permanece no documento e fora do arquivo.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-017.test.ts com node:test, marcador SPECSFY:AC-017, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-017.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-017.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir o áudio permanece no documento e fora do arquivo; senão registrar que o caso já está específico.

- [x] T019 [P] [TEST] [TDD] [US-002] Derivar do AC-018 um caso RED do Node test runner em tests/documentos-avaliacao/ac-018.test.ts — Refs: US-002, NFR-002, AC-018 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-018 na spec e confirmar que o caso prova: o tempo sozinho não apaga o documento nem a cópia.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-018.test.ts com node:test, marcador SPECSFY:AC-018, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-018.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-018.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir o tempo sozinho não apaga o documento nem a cópia; senão registrar que o caso já está específico.

- [x] T020 [P] [TEST] [TDD] [US-001] Derivar do AC-019 um caso RED do Node test runner em tests/documentos-avaliacao/ac-019.test.ts — Refs: US-001, NFR-002, AC-019 — Depends: T001
  - [x] **PREP**: Ler o Gherkin de AC-019 na spec e confirmar que o caso prova: salvar uma alteração não marca exclusão automática.
  - [x] **EXECUTE**: Escrever tests/documentos-avaliacao/ac-019.test.ts com node:test, marcador SPECSFY:AC-019, sem arquivo .feature.
  - [x] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-019.test.ts` e observar RED enquanto o comportamento ainda não existe.
  - [x] **VISUAL**: Não aplicável porque a tarefa só cria tests/documentos-avaliacao/ac-019.test.ts, sem tela.
  - [x] **EVIDENCE**: Em 2026-09-23, `npm run test:tdd` falhou com Error: comportamento ausente.
  - [x] **IMPROVE**: Ajustar o nome do teste se ele não distinguir salvar uma alteração não marca exclusão automática; senão registrar que o caso já está específico.

#### Fase 3 — Persistência e regras

- [ ] T021 [CODE] [MIGRATION] [US-001] Criar tabelas do documento, da versão e da cópia em supabase/migrations/20260923140000_documentos_avaliacao.sql — Refs: US-001, US-002, FR-001, FR-002, FR-003, FR-005, NFR-001, NFR-002, AC-001, AC-004, AC-007, AC-015 — Depends: T002, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013, T014, T015, T016, T017, T018, T019, T020
  - [x] **PREP**: Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. Confirmar o RED dos casos AC-001, AC-004, AC-007 e AC-015. Carregar $specsfy-specialist-supabase antes de escrever SQL.
  - [ ] **EXECUTE**: Criar supabase/migrations/20260923140000_documentos_avaliacao.sql com documento, versão anterior, cópia do arquivo, tenant e política para a profissional responsável, sem prazo de exclusão.
  - [ ] **VERIFY**: Aplicar com `npx supabase migration up --local` e consultar com `npx supabase migration list --local`.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só altera supabase/migrations/20260923140000_documentos_avaliacao.sql, sem tela.
  - [ ] **EVIDENCE**: O arquivo supabase/migrations/20260923140000_documentos_avaliacao.sql existe. `npx supabase migration up --local` falhou em 2026-09-23 com ECONNREFUSED 127.0.0.1:54322 porque o Docker está parado. A consulta de estado ainda não rodou.
  - [ ] **IMPROVE**: Revisar índices de paciente e clínica; aplicar o ajuste ou registrar que o desenho já cobre a busca da ficha.

- [ ] T022 [CODE] [US-001] Salvar a página e a versão anterior em lib/documentos-avaliacao/salvar.ts — Refs: US-001, FR-002, AC-004, AC-005, AC-006 — Depends: T021
  - [ ] **PREP**: Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. Confirmar RED de AC-004, AC-005 e AC-006.
  - [ ] **EXECUTE**: Implementar em lib/documentos-avaliacao/salvar.ts o salvamento com título opcional, valor opcional e versão anterior a cada alteração.
  - [ ] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-004.test.ts tests/documentos-avaliacao/ac-005.test.ts tests/documentos-avaliacao/ac-006.test.ts` e observar GREEN.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só altera lib/documentos-avaliacao/salvar.ts, sem tela.
  - [ ] **EVIDENCE**: Registrar GREEN, o arquivo e os IDs na seção 11.
  - [ ] **IMPROVE**: Extrair a regra de Sem título se ela estiver espalhada; senão registrar que um único ponto basta.

- [ ] T023 [CODE] [US-002] Montar o arquivo baixado e a cópia em lib/documentos-avaliacao/arquivo.ts — Refs: US-002, FR-003, NFR-001, AC-007, AC-008, AC-009, AC-017 — Depends: T022
  - [ ] **PREP**: Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. Confirmar RED de AC-007, AC-008, AC-009 e AC-017.
  - [ ] **EXECUTE**: Implementar em lib/documentos-avaliacao/arquivo.ts o download com texto, valor só quando preenchido, e cópia ligada ao documento e à paciente, sem áudio, anexo, tabela, lista de verificação ou subpágina.
  - [ ] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-007.test.ts tests/documentos-avaliacao/ac-008.test.ts tests/documentos-avaliacao/ac-009.test.ts tests/documentos-avaliacao/ac-017.test.ts` e observar GREEN.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só altera lib/documentos-avaliacao/arquivo.ts, sem tela.
  - [ ] **EVIDENCE**: Registrar GREEN, o arquivo e os IDs na seção 11.
  - [ ] **IMPROVE**: Deixar explícito no arquivo a ausência do valor quando ele não foi preenchido, se a leitura ainda permitir dúvida.

- [ ] T024 [CODE] [US-002] Separar orçamento, contrato e exclusão das cópias em lib/documentos-avaliacao/separacao.ts — Refs: US-002, FR-005, NFR-002, AC-013, AC-014, AC-015, AC-018, AC-019 — Depends: T023
  - [ ] **PREP**: Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. Confirmar RED de AC-013, AC-014, AC-015, AC-018 e AC-019.
  - [ ] **EXECUTE**: Implementar em lib/documentos-avaliacao/separacao.ts a exclusão conjunta, a ausência de cópia no contrato e a ausência do preço por procedimento no arquivo, sem prazo automático.
  - [ ] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-013.test.ts tests/documentos-avaliacao/ac-014.test.ts tests/documentos-avaliacao/ac-015.test.ts tests/documentos-avaliacao/ac-018.test.ts tests/documentos-avaliacao/ac-019.test.ts` e observar GREEN.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só altera lib/documentos-avaliacao/separacao.ts, sem tela.
  - [ ] **EVIDENCE**: Registrar GREEN, o arquivo e os IDs na seção 11.
  - [ ] **IMPROVE**: Conferir se a exclusão remove as duas cópias do AC-015 num único caminho; ajustar se houver um segundo apagamento esquecido.

- [ ] T025 [P] [CODE] [US-001] Restringir a seção à profissional responsável em lib/documentos-avaliacao/acesso.ts — Refs: US-001, US-002, FR-001, NFR-001, AC-001, AC-003, AC-016 — Depends: T021
  - [ ] **PREP**: Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. Confirmar RED de AC-001, AC-003 e AC-016.
  - [ ] **EXECUTE**: Implementar em lib/documentos-avaliacao/acesso.ts a leitura só da profissional responsável e a ausência de abertura para a paciente.
  - [ ] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-001.test.ts tests/documentos-avaliacao/ac-003.test.ts tests/documentos-avaliacao/ac-016.test.ts` e observar GREEN nesses casos de acesso.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só altera lib/documentos-avaliacao/acesso.ts, sem tela.
  - [ ] **EVIDENCE**: Registrar GREEN, o arquivo e os IDs na seção 11.
  - [ ] **IMPROVE**: Recusar um segundo caminho de leitura se o teste de AC-016 ainda alcançar o documento por outra função.

#### Fase de interface

- [ ] T026 [CODE] [US-001] Incluir o item Documentos na navegação da ficha em components/clients/paciente-ficha-nav.tsx — Refs: US-001, FR-001, NFR-001, AC-001, AC-003 — Depends: T025
  - [ ] **PREP**: Carregar $specsfy-specialist-react-ui-components antes de escrever TSX. Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. Confirmar a navegação atual da ficha e o RED de AC-003.
  - [ ] **EXECUTE**: Acrescentar o item Documentos em components/clients/paciente-ficha-nav.tsx, visível só para a profissional responsável, sem remover Anexos.
  - [ ] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-003.test.ts` e conferir a navegação da ficha com e sem a responsável.
  - [ ] **VISUAL**: Conferir bordas, espaçamentos, margens, padding e tipografia do item no menu da ficha, no computador e no celular.
  - [ ] **EVIDENCE**: Registrar o arquivo, o comando e o resultado da navegação na seção 13.
  - [ ] **IMPROVE**: Alinhar o item ao espaçamento dos itens já existentes, ou registrar que o grupo já estava uniforme.

- [ ] T027 [CODE] [US-001] Mostrar a lista com data de criação e título em components/clients/documentos-avaliacao-lista.tsx — Refs: US-001, FR-001, AC-002, AC-005 — Depends: T022, T026
  - [ ] **PREP**: Carregar $specsfy-specialist-react-ui-components antes de escrever TSX. Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. A lista usa data de criação e título, sem coluna de ID técnico.
  - [ ] **EXECUTE**: Criar components/clients/documentos-avaliacao-lista.tsx com List do ReUI e compor a rota em app/(dashboard)/pacientes/[clientId]/documentos/page.tsx quando já existem documentos.
  - [ ] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-002.test.ts tests/documentos-avaliacao/ac-005.test.ts` e observar a lista com título e com Sem título.
  - [ ] **VISUAL**: Conferir bordas, espaçamentos, margens, padding e tipografia da lista, inclusive a linha Sem título.
  - [ ] **EVIDENCE**: Registrar os arquivos, o comando e a lista observada.
  - [ ] **IMPROVE**: Ajustar o texto Sem título se a data de criação competir com ele na leitura; senão registrar que a linha já identifica o documento.

- [ ] T028 [CODE] [US-001] Abrir a página em branco e o conteúdo na mesma tela em components/clients/documento-avaliacao-pagina.tsx — Refs: US-001, FR-001, FR-002, AC-001, AC-004, AC-005, AC-006 — Depends: T027
  - [ ] **PREP**: Carregar $specsfy-specialist-react-ui-components antes de escrever TSX. Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. Título e valor ficam nesta página, sem formulário anterior.
  - [ ] **EXECUTE**: Criar components/clients/documento-avaliacao-pagina.tsx para a página em branco, o texto, a tabela, a lista de verificação, a subpágina, os anexos e o áudio, e compor essa página na rota quando não há documento.
  - [ ] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-001.test.ts tests/documentos-avaliacao/ac-005.test.ts tests/documentos-avaliacao/ac-006.test.ts` e exercitar navegação, envio do salvamento e validação de título e valor vazios.
  - [ ] **VISUAL**: Conferir bordas, espaçamentos, margens, padding e tipografia da página em branco e da página com texto.
  - [ ] **EVIDENCE**: Registrar o arquivo, o comando e o salvamento com e sem título.
  - [ ] **IMPROVE**: Manter o texto como foco da página se o título e o valor disputarem a mesma faixa; senão registrar que a leitura já prioriza o texto.

- [ ] T029 [CODE] [US-001] Colocar salvar, imprimir, baixar, áudio e versões em components/clients/documento-avaliacao-acoes.tsx — Refs: US-001, US-002, FR-003, FR-004, AC-007, AC-010, AC-011, AC-012 — Depends: T023, T028
  - [ ] **PREP**: Carregar $specsfy-specialist-react-ui-components antes de escrever TSX. Reconstruir docs/ com $specsfy-documentator antes do EXECUTE. No computador o padrão é painel lateral; no celular as ações ficam no alto.
  - [ ] **EXECUTE**: Criar components/clients/documento-avaliacao-acoes.tsx com Sheet do ReUI no computador e as mesmas ações no alto da página no celular, incluindo imprimir a página visível e baixar o arquivo.
  - [ ] **VERIFY**: Rodar `npm run test:tdd -- tests/documentos-avaliacao/ac-010.test.ts tests/documentos-avaliacao/ac-011.test.ts tests/documentos-avaliacao/ac-012.test.ts` e conferir o painel, o alto da página e a recuperação do download sem valor em AC-008.
  - [ ] **VISUAL**: Conferir bordas, espaçamentos, margens, padding e tipografia do painel no computador e das ações no alto no celular, sem cobrir o texto.
  - [ ] **EVIDENCE**: Registrar o arquivo, o comando e o resultado nos dois viewports.
  - [ ] **IMPROVE**: Se o painel cobrir o texto em alguma largura, recolher a largura; senão registrar que o texto permanece visível.

- [ ] T030 [DOC] [US-001] Registrar os blocos da seção em INTERFACE.md — Refs: US-001, FR-001, FR-004, AC-001, AC-011, AC-012 — Depends: T026, T027, T028, T029
  - [ ] **PREP**: Ler a seção 10 e os arquivos criados da lista, da página, das ações e do item de navegação.
  - [ ] **EXECUTE**: Atualizar INTERFACE.md com finalidade, arquivo, estados, consumidores e reaproveitamento de documentos-avaliacao-lista.tsx, documento-avaliacao-pagina.tsx, documento-avaliacao-acoes.tsx e do item em paciente-ficha-nav.tsx.
  - [ ] **VERIFY**: Conferir que cada bloco da seção 10 aparece em INTERFACE.md com o arquivo correspondente.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só atualiza INTERFACE.md, sem tela nova.
  - [ ] **EVIDENCE**: Registrar os blocos acrescentados e os arquivos citados.
  - [ ] **IMPROVE**: Completar um estado faltante da página em branco ou da lista Sem título, se o mapa ainda não o citar.

#### Fase final — Documentação

- [ ] T031 [DOC] [US-001] Alinhar o que a entrega guarda em .specsfy/DATABASE.md — Refs: US-001, US-002, FR-002, FR-003, NFR-002, AC-004, AC-007, AC-015 — Depends: T021
  - [ ] **PREP**: Comparar a migration com as linhas já confirmadas de documento, versão, cópia, áudio e anexo.
  - [ ] **EXECUTE**: Atualizar .specsfy/DATABASE.md com a estrutura persistida, sem apagar o registro da conversa.
  - [ ] **VERIFY**: Conferir documento, versão anterior, cópia, paciente e ausência de prazo automático no arquivo.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só atualiza .specsfy/DATABASE.md, sem tela.
  - [ ] **EVIDENCE**: Registrar as linhas alteradas e a migration correspondente.
  - [ ] **IMPROVE**: Corrigir uma ligação faltante com a paciente, se a tabela da conversa e a migration divergirem.

- [ ] T032 [DOC] [US-001] Registrar acesso e permanência em .specsfy/RULES.md — Refs: US-001, NFR-001, NFR-002, AC-003, AC-016, AC-018 — Depends: T025
  - [ ] **PREP**: Relacionar NFR-001 e NFR-002 com o texto atual de .specsfy/RULES.md.
  - [ ] **EXECUTE**: Acrescentar em .specsfy/RULES.md que só a profissional responsável vê o documento e que ele permanece até ela apagar, junto com as cópias.
  - [ ] **VERIFY**: Localizar as duas regras no arquivo e confirmar que não contradizem o isolamento da clínica.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só atualiza .specsfy/RULES.md, sem tela.
  - [ ] **EVIDENCE**: Registrar as regras acrescentadas e os IDs.
  - [ ] **IMPROVE**: Fundir a redação com uma regra já existente de prontuário, se o arquivo já disser o mesmo.

- [ ] T033 [P] [DOC] [US-001] Registrar o script test:tdd em .specsfy/STACK.md — Refs: US-001, FR-001, AC-001 — Depends: T001
  - [ ] **PREP**: Ler a entrada de testes em .specsfy/STACK.md e o script declarado em package.json.
  - [ ] **EXECUTE**: Registrar em .specsfy/STACK.md o Node test runner nativo e o script test:tdd, sem trocar a stack da aplicação.
  - [ ] **VERIFY**: Conferir que STACK.md cita package.json e o comando npm run test:tdd.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só atualiza .specsfy/STACK.md, sem tela.
  - [ ] **EVIDENCE**: Registrar o trecho acrescentado.
  - [ ] **IMPROVE**: Remover menção residual a outro runner, se o arquivo passar a citar dois.

- [ ] T034 [DOC] [US-001] Revisar a capacidade da ficha em PROJECT.md — Refs: US-001, US-002, FR-001, FR-003, AC-001, AC-007 — Depends: T030
  - [ ] **PREP**: Ler a finalidade e as capacidades atuais em PROJECT.md.
  - [ ] **EXECUTE**: Incluir em PROJECT.md a seção Documentos da avaliação na ficha, com arquivo baixado e versão, se essa capacidade ainda não estiver descrita.
  - [ ] **VERIFY**: Confirmar que PROJECT.md cita a seção na ficha da paciente e não a confunde com Anexos.
  - [ ] **VISUAL**: Não aplicável porque a tarefa só atualiza PROJECT.md, sem tela.
  - [ ] **EVIDENCE**: Registrar o parágrafo alterado ou a justificativa de que a capacidade já estava descrita.
  - [ ] **IMPROVE**: Encurtar o parágrafo se ele repetir o texto da spec; senão registrar que a menção cabe no mapa do produto.

### 15. Ordem de execução

- Caminho crítico: T001 → T002 a T020 → T021 → T022 → T023 → T024 → T026 → T027 → T028 → T029 → T030 → T034.
- Tarefas paralelas: T002 a T020, cada uma no próprio arquivo de teste, depois de T001. T025 em paralelo com T022, depois de T021. T033 em paralelo com os testes, depois de T001. T031 depois de T021. T032 depois de T025.
- Estratégia de MVP: a profissional responsável abre a página em branco, salva com versão, baixa o arquivo e vê a seção só para ela. Documentação de banco, regras e produto fecha junto dessa fatia.

## Ato III — Entregar e validar

### 16. Dependências, riscos e suposições

#### Dependências

- Ficha da paciente e navegação atual.
- Orçamentos e contratos existentes, que permanecem independentes.
- Armazenamento privado para áudio e anexos.

#### Riscos

- A página visível na impressão inclui áudio e blocos que o arquivo baixado não inclui. A profissional pode achar que são o mesmo artefato.
- Salvar e baixar sem valor produz um arquivo sem o valor do protocolo. Isso foi decidido, e o arquivo precisa deixar essa ausência evidente para ela antes do envio por fora.
- Estados de erro ainda não decididos podem travar a implementação se forem tratados como requisito fechado.

#### Suposições

- O runner confirmado é o Node test runner nativo, acionado por `npm run test:tdd`.
- O painel lateral no computador corresponde a um painel ReUI, e no celular as mesmas ações ficam no alto, sem esse painel.
- A palavra Sem título, com essa grafia, é o texto da lista enquanto o título estiver vazio.

### 17. Decisões

- **DEC-001**: A seção se chama Documentos e fica na ficha. Anexos não muda. Origem: opção 1 em 2026-09-23.
- **DEC-002**: Título e valor ficam na página, sem tela anterior. Origem: opção 1 em 2026-09-23.
- **DEC-003**: No computador as ações ficam no painel lateral. No celular, no alto da página. Origem: opções 2 e 3 em 2026-09-23.
- **DEC-004**: Dá para salvar sem título e dá para salvar e baixar sem valor. Origem: opções 3 em 2026-09-23.
- **DEC-005**: O arquivo leva texto e valor preenchido. Áudio, anexos, tabela, lista de verificação e subpágina ficam no documento. Origem: opções 1 e 2 do áudio e dos blocos, e opção 3 do valor.
- **DEC-006**: Cada download guarda uma cópia ligada ao documento e à paciente. Documento e cópias saem juntos quando ela apaga, sem prazo automático. Origem: resposta escrita e opção 1 do prazo.
- **DEC-007**: Sem documentos, a página em branco abre direto. Origem: opção 2 em 2026-09-23.
- **DEC-008**: Os testes desta entrega usam o Node test runner nativo, com o script `test:tdd` em `package.json`. Origem: opção 3 em 2026-09-23.

### 18. Definition of Done

- [ ] A profissional responsável abre Documentos numa paciente sem documentos e encontra a página em branco.
- [ ] A lista mostra data de criação e título, ou Sem título.
- [ ] Outra pessoa da clínica não vê a seção.
- [ ] Salvar uma alteração guarda a versão anterior.
- [ ] O arquivo baixado respeita o conteúdo decidido e cada envio gera uma cópia.
- [ ] Imprimir mostra a página visível.
- [ ] As ações respeitam computador e celular.
- [ ] Apagar o documento apaga as cópias.
- [ ] Orçamento e contrato permanecem sem cópia automática deste documento.
- [ ] A informação guardada desta entrega permanece coerente com `.specsfy/DATABASE.md`.
- [ ] A regra de acesso só da profissional responsável e a permanência até ela apagar ficam registradas em `.specsfy/RULES.md`.
- [x] A validação semântica do Ato I registra o resultado na seção 13.
