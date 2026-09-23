# Backlog: Documentos da avaliação no cadastro da paciente

| Metainformação | Valor |
| --- | --- |
| ID | BACKLOG-0001 |
| Status | Promoted |
| Produto | Clínica de estética |
| Épico | A esclarecer |
| Funcionalidade | Documentos da avaliação no cadastro da paciente |
| Tipo | História |
| Prioridade | Não priorizado |
| Milestones | |
| Criado em | 2026-09-23 |
| Spec promovida | specs/in-progress/0001-documentos-da-avaliacao-no-cadastro-da-paciente/spec.md |

## Ideia original

dentro de um cadastro de um paciente quero que tenha uma nova aba segue o audio da solicitaçao do cliente: Áudio 1:"Ter uma aba como todas as outras que tem lá, tipo a do contrato, onde eu consiga adicionar novo documento, tipo ah, novo documento, aí abre uma página em branco e eu consigo digitar tudo lá e salvar. E aí ficam os arquivos salvos, tipo tudo o que eu, eh, abri de novo arquivo fica lá listado bonitinho todos os documentos, entendeu? Porque..."   Áudio 2:"...a minha ideia é a seguinte. Ideia... minha ideia não, ideia que eu acabei de ouvir e para mim fez muito sentido. É, durante a avaliação, tudo o que a cliente falar eu vou anotar, vou anotando, anotando, anotando e já vou fazendo o orçamento ali, eh, simultaneamente, enfim. Mas é como se eu fizesse um relatório de toda a avaliação, entendeu? E aí no final eu consigo, eh, salvar, imprimir ou, enfim, encaminhar para o cliente como um arquivo, entendeu? Porque ali eu já vou deixar o relatório com o orçamento, valor do protocolo, enfim..."   Áudio 3:"...porque aí aquela aba de orçamentos vai ser meu só, para eu ter um controlo do que eu vendi para o paciente, mas quando eu for mandar, eu não vou mandar tipo o valor de cada procedimento, eu vou mandar o valor do protocolo, sabe? Sem, eh, desmembrar ali os por cada procedimento que ela vai fazer. Manda tudo junto, separado por tópicos do tratamento. Né, então ela não vai ter acesso a valores, eh, avulsos. Ela vai ter acesso ao valor do protocolo dela. Junto ali com as queixas, tudo o que ela me falou, ela vai conseguir ver bonitinho tudo o que foi conversado, tudo o que foi passado num lugar só. E é bom que isso já fica documentado para mim. E aí qualquer coisa que eu precisar anexar em contrato já fica ali tudo bonitinho."  

como eu imagino agora em termos tecnicos: um Editor de Texto Baseado em Blocos (Block-based Rich Text Editor): É o paradigma de interface (popularizado por ferramentas como o Notion e o ClickUp) onde cada elemento — seja um parágrafo, tabela, lista de verificação, subpágina ou anexo — é tratado como um bloco individual e independente de dados.   Editor WYSIWYG (What You See Is What You Get): Termo genérico para editores de texto formatado onde o resultado visual durante a edição reflete exatamente a exportação (PDF, HTML, etc.).Edição Colaborativa em Tempo Real (Real-Time Collaborative Editing): A tecnologia que permite a múltiplos utilizadores editarem a mesma página em simultâneo, normalmente suportada por sincronização via WebSockets e algoritmos de CRDTs (Conflict-free Replicated Data Types).Bibliotecas e seleções de tecnologia (open-source) para construir esta funcionalidade:TipTap / ProseMirror: O ecossistema mais robusto para criar editores ricos, flexíveis e baseados em blocos.Novel: Um componente pronto a usar (inspirado no Notion/ClickUp) construído sobre TipTap e Tailwind CSS com suporte nativo para comandos de IA.Editor.js: Um editor de texto estruturado por blocos que gera e lê diretamente dados em formato JSON limpo.Slate.js: Estrutura altamente personalizável para desenvolvimento em React.Yjs: A biblioteca de colaboração em tempo real mais comum para integrar com TipTap, ProseMirror ou Slate.

semelhante ao que o clickup faz hoje com um extra exclusivo nosso! ja vamos ter um excrever com i.a estruturado baseado no formato de api da open-ai onde podemos usar o openrouter e ou 9router como roteadores a uma i.a. 
uma possibilidade de iniciar uma gravaçao de audio onde vamos ja deixar pronto a estrutura futuramente vamos concluir e integrar a i.a no projeto mas de inicio a prioridade é a possibilidade de escrever etc...

## Problema percebido

Durante a avaliação, a profissional anota o que a paciente fala e precisa deixar isso num relatório que possa salvar, imprimir ou encaminhar, com o valor do protocolo e sem o preço de cada procedimento. A aba de orçamentos continua sendo o controle interno do que foi vendido.

## Pessoa afetada ou beneficiada

A profissional responsável pela paciente, que escreve e consulta o documento. A paciente recebe o arquivo encaminhado, com o texto e o valor do protocolo, e não abre o documento no sistema.

## Resultado ou valor esperado

No cadastro da paciente, a profissional cria um documento em página em branco, escreve o relatório da avaliação, informa o valor do protocolo, anexa arquivos, salva, vê a lista dos documentos e encaminha um arquivo. Cada salvamento guarda a versão anterior. O sistema guarda uma cópia do arquivo encaminhado enquanto o documento existir.

## Contexto

Aba nova no cadastro da paciente, no mesmo lugar das abas já existentes, como a de contrato. Distinta da aba de orçamentos, que permanece independente e guarda o preço de cada procedimento. Origem: specs/inbox/2026-09-22-225338-aba-de-documentos-no-cadastro-da-paciente.md. Dados confirmados: .specsfy/DATABASE.md.

## Referências relacionadas

- `specs/inbox/2026-09-22-225338-aba-de-documentos-no-cadastro-da-paciente.md` — origem da captura. Não é duplicata.
- `.specsfy/DATABASE.md` — dados confirmados na descoberta de 2026-09-23.
- `documentacao/roadmap_e_plano_clickup.md` — documentação relacionada: orçamentos, protocolos e contratos já existem no produto.
- `documentacao/prd_clinica_estetica.md` — documentação relacionada: termos e contratos. Nenhuma spec em `specs/` cobre este documento da avaliação.

## Comportamento esperado

Decisões já confirmadas na conversa, ainda sem critério de aceite:

- Na seção Documentos, a profissional abre um documento em página em branco. Título, valor do protocolo e texto ficam nessa mesma página. Ela escreve, anexa e salva ali.
- Os documentos salvos aparecem em lista, com a data e um título curto escrito pela profissional.
- Cada salvamento de uma alteração guarda o estado anterior como versão. A profissional consulta, altera e apaga versões como a versão atual.
- A profissional baixa o arquivo e envia por fora do sistema. O sistema guarda uma cópia de cada encaminhamento, ligada ao documento e à paciente. A paciente não recebe o arquivo pelo sistema e não abre o documento.
- Ao imprimir, a profissional imprime a página do documento como está vendo.
- A cópia sai se o documento for apagado.

## Regras de negócio

- O documento fica ligado somente à paciente. A aba de orçamentos segue independente.
- O contrato não guarda uma cópia deste documento. A profissional usa o documento, que continua na paciente, na hora de montar o contrato.
- O documento e as cópias encaminhadas permanecem enquanto a profissional não apagar o documento. Não há prazo automático. Se ela apagar o documento, as cópias também saem.
- O valor do protocolo é um valor em dinheiro do documento, separado do texto.
- O texto da página guarda queixas, tópicos do tratamento e o que foi conversado.
- Nesta entrega a página também tem tabela, lista de verificação e subpágina, além do valor do protocolo, dos anexos e do áudio.
- Os anexos fazem parte do documento e entram na versão daquele momento.
- O preço de cada procedimento permanece na aba de orçamentos. O arquivo encaminhado leva o valor do protocolo.
- Somente a profissional responsável pela paciente vê, altera e apaga o documento, as versões, os anexos e o áudio. Para as outras pessoas da clínica, a seção Documentos não aparece na ficha.
- O áudio, os anexos, a tabela, a lista de verificação e a subpágina ficam só no documento, para a profissional. O arquivo encaminhado leva o texto. O valor do protocolo entra nesse arquivo quando estiver preenchido. Dá para salvar e baixar sem o valor; nesse caso o arquivo sai sem ele.
- A ficha da paciente ganha a seção Documentos, no mesmo grupo de Resumo, Anamnese, Evolução, Contratos, Financeiro, Anexos, Fotos e Histórico. Anexos continua como está. Para quem não é a profissional responsável, a seção não aparece.
- Quando a paciente ainda não tem documento, abrir Documentos já mostra a página em branco, pronta para escrever. Quando já existem documentos, a lista mostra a data de criação e o título. Novo documento abre uma página em branco.
- No computador, salvar, imprimir, baixar, gravar áudio e ver versões ficam num painel lateral, sem cobrir o texto. No celular, essas ações ficam no alto da página.

## Critérios de aceitação

- A esclarecer antes de considerar o item refinado.

## Qualidades e operação

- Segurança: a avaliar além de quem acessa o documento.
- Privacidade: a paciente não abre o documento no sistema e não recebe o preço de cada procedimento. O arquivo encaminhado leva o texto e, quando preenchido, o valor do protocolo.
- Desempenho e volume: a avaliar.
- Auditoria e observabilidade: a avaliar. As versões guardam o estado anterior a cada salvamento.

## Dependências

- Cadastro da paciente, onde a aba entra.
- Aba de orçamentos já existente, que permanece independente.
- Aba de contrato citada como referência de lugar na mesma ficha. Ligação de dados com o contrato ainda não confirmada.

## Situações de erro

- A esclarecer.

## Escopo

- Dentro: criar o documento, escrever texto, tabela, lista de verificação e subpágina, anexar, gravar áudio, informar o valor do protocolo, salvar com versão, listar com data e título, imprimir a página como a profissional vê, e encaminhar o arquivo.
- Fora desta entrega: escrever com IA e escrita ao mesmo tempo por mais de uma pessoa.
- Decisão em 2026-09-23, opção 1: o áudio gravado fica no documento, como arquivo, junto com o texto e os anexos, e entra na versão daquele momento. A profissional ouve, altera e apaga esse áudio como o restante do documento.
- Decisão em 2026-09-23, opção 2: o áudio fica só no documento, para a profissional. O arquivo encaminhado leva o texto e o valor do protocolo.

## Dúvidas, decisões e riscos

- Decisão: dados confirmados em `.specsfy/DATABASE.md` em 2026-09-23.
- Decisão de escopo em 2026-09-23, opção 2: esta entrega inclui criar, escrever, anexar, salvar com versão, listar, informar o valor do protocolo, imprimir, encaminhar e iniciar uma gravação de áudio. Escrever com IA e escrita simultânea ficam fora.
- Decisão escrita em 2026-09-23: cada encaminhamento guarda a sua cópia, ligada ao documento e à própria paciente. A paciente fica com cada arquivo que recebeu.
- Decisão em 2026-09-23, opção 1: a profissional baixa o arquivo e envia por fora do sistema. O sistema guarda a cópia.
- Decisão em 2026-09-23, opção 1: o contrato não guarda uma cópia. O documento continua na paciente, e a profissional leva o que precisar na hora.
- Decisão em 2026-09-23, opção 3: a lista mostra a data e um título curto escrito pela profissional. Opção 1: essa data é a data em que o documento foi criado.
- Decisão em 2026-09-23, opção 3: imprimir usa a página do documento como a profissional está vendo, para ela imprimir dali.
- Decisão em 2026-09-23, opção 3: a página tem texto, tabela, lista de verificação e subpágina, além do valor do protocolo, dos anexos e do áudio.
- Decisão em 2026-09-23, opção 1: tabela, lista de verificação e subpágina ficam no documento. O arquivo encaminhado leva o texto e o valor do protocolo.
- Limite de oito perguntas atingido em 2026-09-23. As 4 perguntas pedidas em seguida foram respondidas no mesmo dia. A área de interface começou em 2026-09-23, quando a pessoa pediu para seguir.
- Decisão em 2026-09-23, opção 1: documento e cópias permanecem enquanto a profissional não apagar. Não há prazo automático.
- Decisão de interface em 2026-09-23, opção 1: a seção se chama Documentos e fica ao lado das outras na ficha. Anexos continua como está. Stack observada: navegação em `components/clients/paciente-ficha-nav.tsx`, seções em páginas próprias.
- Decisão de interface em 2026-09-23, opção 1: o título e o valor do protocolo ficam na própria página do documento, junto com o texto. Não há uma tela anterior.
- Decisão de interface em 2026-09-23, opção 2: no computador, salvar, imprimir, baixar, gravar áudio e ver versões ficam num painel lateral aberto a partir da página, sem cobrir o texto por completo.
- Decisão de interface em 2026-09-23, opção 3: no celular, essas ações ficam no alto da página. O painel lateral fica só no computador.
- Decisão de interface em 2026-09-23, opção 3: dá para salvar o documento sem título. A lista mostra "Sem título" até a profissional escrever um.
- Decisão de interface em 2026-09-23, opção 3: dá para salvar e baixar sem o valor do protocolo. O arquivo sai com o texto e sem esse valor.
- Decisão de interface em 2026-09-23, opção 1: a seção Documentos não aparece para quem não é a profissional responsável.
- Decisão de interface em 2026-09-23, opção 2: quando ainda não há documento, abrir Documentos já mostra a página em branco, pronta para escrever.
- Limite de oito perguntas da área de interface atingido em 2026-09-23. Sem conversa: carregando, erro, teclado e filtros da lista.
- Exceção explícita à matriz padrão de CRUD, por decisão da pessoa: a escrita não abre um formulário anterior; título e valor ficam na página. No computador as ações usam painel lateral. No celular ficam no alto da página. A primeira abertura, sem documentos, mostra a página em branco em vez da lista vazia.
- Especialistas `specsfy-specialist-interface-experience` e `specsfy-specialist-ux-design` não estão instalados. A composição usou o contrato de interface, a ficha atual, `$specsfy-specialist-ui-design` e `$specsfy-specialist-reui`. ReUI entra depois como base de lista, formulário na página e painel lateral, sem trocar as decisões acima.
- Hipótese técnica da captura, não requisito: biblioteca de editor, colaboração em tempo real, OpenRouter e 9router.

## Pronto para desenvolvimento

- [x] O problema e a pessoa beneficiada estão claros.
- [x] O evento inicial e o resultado esperado estão claros.
- [ ] Permissões, regras e exceções relevantes estão claras.
- [ ] O resultado pode ser verificado objetivamente.
- [ ] Segurança, privacidade e desempenho foram avaliados conforme o risco.
- [ ] Fora de escopo, dependências e decisões pendentes estão registrados.

## Próximo passo

Aprofundar nesta etapa até o item ficar pronto para `$specsfy-03-specify`.
