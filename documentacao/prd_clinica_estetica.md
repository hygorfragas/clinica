# PRD --- Sistema de Gestão para Clínica de Estética (MVP)

## 1. Visão do Produto

Criar um sistema simples, 100% digital, para gestão de pacientes e
procedimentos de uma clínica estética.

## 2. Usuário-alvo

Profissional autônoma (esteticista)

## 3. Jornada do Usuário

1.  Cadastro / busca de cliente
2.  Anamnese digital
3.  Agendamento
4.  Atendimento
5.  Pós-atendimento

## 4. Funcionalidades do MVP

-   Agenda
-   Cadastro de clientes
-   Anamnese digital
-   Ficha de evolução
-   Fotos (com região do procedimento; rosto com ângulos para base do boneco digital — ver §6.1)
-   Termos e contratos
-   Orçamentos
-   Procedimentos
-   Controle de sessões
-   Controle de estoque (básico)
-   Financeiro (manual)

## 5. Estrutura

Cliente como entidade central com histórico completo.

## 6. Escopo

### 6.1 Fotos clínicas e boneco digital (rosto)

-   Cada envio de fotos deve registrar a **região do procedimento** (rosto, pescoço, tronco, membros, glúteos, outra).
-   Para a região **rosto / face** (única em que o boneco digital se aplica neste MVP), o sistema solicita **classificação por ângulo** (frente, perfil esquerdo, perfil direito, superior, inferior ou ângulo customizado), alinhado à necessidade de múltiplas vistas para planejamento e, em evoluções futuras, sobreposição de guias anatômicos (mímica facial, planos de aplicação).
-   É possível enviar **até 15 imagens por lote**; mais de uma foto por ângulo é permitida (ex.: antes/depois).
-   Para **outras regiões**, não há obrigatoriedade de ângulos: a documentação fica livre para evolução clínica.
-   A **emulação 3D completa** (malha reconstruída automaticamente a partir das fotos) não é prometida no MVP: a primeira entrega organiza e classifica as imagens e prepara o terreno para visualização avançada (canvas/Konva ou pipeline de malha validado), sem substituir julgamento clínico da profissional.

### Must have

-   Agenda
-   Cadastro
-   Anamnese
-   Orçamento
-   Sessões
-   Estoque básico

### Fora do MVP

-   Gateway de pagamento
-   Relatórios avançados

## 7. Próximos passos

-   Wireframes
-   Modelagem de dados
-   Desenvolvimento MVP
