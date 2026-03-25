# Operational Flows

## Tese de fluxo

O sistema deve operar como uma cadeia conectada de trabalho. O usuário não deveria “pular de módulo em módulo” sem contexto. O produto deve guiar a operação.

Fluxo principal do negócio:

`cliente -> orçamento -> ordem de serviço -> financeiro`

## Regra central

Antes de criar uma tela, campo, botão ou endpoint, responda:

1. De qual entidade essa informação nasce?
2. Para qual entidade ela precisa seguir depois?
3. Qual próxima ação o sistema deveria sugerir automaticamente?

Se essas respostas não existirem, o recurso provavelmente está isolado demais.

## Objetivo por domínio

### Clientes

Cliente deve ser a visão-mãe do relacionamento.

A tela ou detalhe ideal de cliente deve mostrar:
- dados principais
- histórico recente
- orçamentos vinculados
- OS vinculadas
- situação financeira
- pendências e próxima ação

Ações desejáveis:
- criar orçamento a partir do cliente
- abrir histórico completo
- visualizar pendências sem sair caçando em outras telas

### Orçamentos

Orçamento deve ser ponte comercial para operação.

Ações desejáveis:
- iniciar com dados do cliente já preenchidos
- duplicar orçamento rapidamente
- aprovar/reprovar/cancelar com rastreabilidade
- converter orçamento aprovado em OS

Ao aprovar, o sistema deve deixar claro:
- o que muda no status
- qual é a próxima etapa
- qual ação operacional vem a seguir

### Ordens de Serviço

OS deve representar o trabalho em execução.

A OS ideal deve mostrar:
- origem comercial
- cliente relacionado
- status atual
- datas relevantes
- observações operacionais
- vínculo com cobrança ou lançamento posterior

Ações desejáveis:
- gerar OS a partir de orçamento aprovado
- atualizar status com clareza
- concluir OS e sugerir ação financeira seguinte

### Financeiro

Financeiro não deve ser um módulo “separado do resto”. Ele deve refletir o que aconteceu no comercial e na operação.

Ações desejáveis:
- criar lançamento com origem conhecida
- mostrar referência de cliente, orçamento ou OS quando existir
- sinalizar atrasos e pendências úteis para cobrança ou decisão

## Padrões de automação desejados

- pré-preenchimento de dados quando a origem já é conhecida
- sugestões de próxima ação com um clique
- mudança de status propagando contexto para a próxima etapa
- atalhos contextuais em listas, detalhes e dashboards
- visão 360 do cliente sem navegação excessiva

## O dashboard ideal

Dashboard não é só resumo. Ele deve responder:

- o que está parado
- o que está atrasado
- o que precisa de decisão
- o que pode ser executado agora

Boas áreas para priorizar:
- orçamentos aguardando retorno
- OS em atraso ou sem atualização
- recebimentos vencidos
- clientes com atividade recente e pendência aberta

## Anti-padrões de fluxo

- cadastro sem origem e sem destino
- botão importante escondido em outro módulo
- usuário precisar redigitar dados já conhecidos
- status sem consequência operacional
- financeiro sem referência da operação que o originou

## Teste rápido de qualidade de fluxo

Se o usuário terminar uma ação e não souber naturalmente o próximo passo, o fluxo ainda está fraco.

Se a informação existir em um módulo, mas não ajudar o módulo seguinte, a integração ainda está incompleta.

Se a automação poupa clique, mas confunde o entendimento, ela está cedo demais ou mal contextualizada.
