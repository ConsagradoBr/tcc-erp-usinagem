# AMP V2 - Especificacao de Consolidacao no Figma

## Objetivo

Consolidar o arquivo Figma `TCC` em uma versao madura do produto, alinhada com:

- a identidade visual do prototipo inicial
- a logica real do sistema atual
- a narrativa oficial definida em [amp-convergencia-v2.md](/d:/AMP-Usinagem-Industrial/tcc-erp-usinagem/docs/tcc/amp-convergencia-v2.md)

Este documento define o que deve ser criado e atualizado no Figma assim que a quota MCP do plano permitir novas operacoes.

Documentos complementares de execucao:

- [amp-figma-v2-build-sequence.md](/d:/AMP-Usinagem-Industrial/tcc-erp-usinagem/docs/design/amp-figma-v2-build-sequence.md)
- [amp-figma-v2-screen-specs.md](/d:/AMP-Usinagem-Industrial/tcc-erp-usinagem/docs/design/amp-figma-v2-screen-specs.md)

## Norte visual oficial

- manter `preto + branco + laranja AMP`
- manter `light` e `dark`
- manter a leveza do arquivo inicial
- reduzir peso visual e fragmentacao
- evitar dashboards inchados
- priorizar tabelas, fluxos e hierarquia
- fazer o sistema parecer sofisticado, tecnico e claro

## Norte funcional oficial

O Figma consolidado precisa refletir estes modulos reais:

- Dashboard
- Clientes e Fornecedores
- Orcamentos
- Ordem de Servico
- Financeiro
- Usuarios
- Backup

Itens que nao entram como modulo principal:

- `NF's` separado
- login social
- signup publico
- `N8N`

## Estrategia de atualizacao do arquivo

### 1. Nao destruir o historico

O arquivo atual deve ser preservado como base historica do TCC.

Criar uma nova area clara para a consolidacao:

- nova pagina ou secao: `AMP V2 Consolidado`

### 2. Reaproveitar o que ja e forte

Base a reaproveitar do Figma atual:

- login
- sidebar compacta
- sidebar expandida
- financeiro light
- financeiro dark
- linguagem do dashboard/menu

### 3. Evoluir sem perder a assinatura

O novo Figma nao deve virar outro produto.

Ele deve parecer:

- a evolucao natural do prototipo inicial
- mais maduro
- mais funcional
- mais coerente com o sistema real

## Estrutura recomendada da pagina `AMP V2 Consolidado`

### Bloco 1 - Fundacoes

- `Login Light - V2`
- `Login Dark - V2`
- `Sidebar Compact Light - V2`
- `Sidebar Compact Dark - V2`
- `Sidebar Expanded Light - V2`
- `Sidebar Expanded Dark - V2`

### Bloco 2 - Dashboard

- `Dashboard Light - V2`
- `Dashboard Dark - V2`

### Bloco 3 - Operacao

- `Clientes e Fornecedores Light - V2`
- `Clientes e Fornecedores Dark - V2`
- `Orcamentos Light - V2`
- `Orcamentos Dark - V2`
- `OS Light - V2`
- `OS Dark - V2`
- `Financeiro Light - V2`
- `Financeiro Dark - V2`

### Bloco 4 - Administracao

- `Usuarios Light - V2`
- `Usuarios Dark - V2`
- `Backup Light - V2`
- `Backup Dark - V2`

## Regras por tela

### Login

Manter:

- composicao ampla
- grande area visual da marca
- formulario simples

Remover da versao oficial:

- botoes `Facebook`
- `Google`
- `Apple`
- `Sign Up Now`

Adicionar:

- mensagem institucional mais alinhada ao produto atual
- leitura clara de acesso controlado por administrador
- adaptacao para desktop nativo

### Sidebar

Manter:

- versao compacta
- versao expandida
- alternancia light/dark
- botao de saida

Atualizar o menu para:

- Dashboard
- Clientes e Fornecedores
- Orcamentos
- Ordem de Servico
- Financeiro
- Usuarios
- Backup

Remover:

- `NF's` como item principal

### Dashboard

O dashboard consolidado precisa ser mais leve do que o sistema atual, mas mais util do que o prototipo inicial.

Deve mostrar:

- visao geral do negocio
- proximas acoes
- conexao `cliente -> orcamento -> OS -> financeiro`
- leitura de saude financeira
- leitura de andamento produtivo

Nao deve:

- virar mosaico excessivo de cards
- repetir informacao que ja esta melhor nas telas operacionais

### Clientes e Fornecedores

Essa sera a maior evolucao conceitual do Figma.

Direcao:

- uma tela unica de relacionamento
- chave visual entre `Clientes` e `Fornecedores`
- dados fiscais incorporados
- historico comercial e financeiro

Objetivo:

- refletir a decisao de integrar fornecedores ao dominio de relacionamento

### Orcamentos

Deve aparecer como modulo proprio.

Conteudos essenciais:

- status comercial
- validade
- aprovacao
- origem do cliente
- transicao para OS e financeiro

### Ordem de Servico

Deve mostrar a visao operacional de producao.

Conteudos essenciais:

- board ou quadro de status
- prioridade
- cliente
- origem do orcamento
- responsavel
- previsao/andamento

### Financeiro

O Figma ja tem a melhor base aqui.

Consolidacao:

- manter a tabela como espinha dorsal
- incluir maturidade real do sistema
- contemplar parcelas, status, juros, vinculo e contexto
- manter a sobriedade visual

### Usuarios

Tela administrativa clara, simples e institucional.

Objetivo:

- mostrar que o sistema tem controle interno de acesso
- reforcar que nao existe cadastro publico aberto

### Backup

Tela enxuta e tecnica.

Objetivo:

- mostrar confiabilidade operacional
- permitir leitura clara de restauracao e seguranca dos dados

## Linguagem visual detalhada

### Light mode

- base clara predominante
- superfícies amplas
- pouco relevo
- laranja como acento de decisao e navegacao
- preto como ancora estrutural

### Dark mode

- fundo escuro profundo
- tabelas e superficies com alto contraste
- laranja com brilho controlado
- sem neon exagerado

### Tipografia

- forte em titulos
- mais limpa e mais tecnica em labels e tabelas
- menos blocos textuais longos

### Espacamento

- grandes respiros entre blocos
- poucos grupos por tela
- elementos com mais hierarquia e menos repeticao

## O que o Figma deve absorver do sistema atual

- OS ja entregue
- Orcamentos ja entregues
- Usuarios ja entregues
- Backup ja entregue
- fluxo financeiro com parcelamento e baixa
- importacao de NF-e e boletos
- host desktop como forma real de uso

## O que o sistema deve absorver depois do Figma consolidado

- leveza
- limpeza
- melhor distribuicao dos espacos
- menos excesso de cards
- melhor relacionamento entre modulos

## Entregavel esperado da Etapa 3

Ao final da consolidacao do Figma, o arquivo deve:

- contar a mesma historia do TCC revisado
- refletir os modulos reais do sistema
- servir como base visual da AMP V2
- ser suficientemente claro para orientar a implementacao final do produto

## Observacao operacional

No momento da criacao deste documento, a autenticacao MCP do Figma foi configurada com sucesso, mas novas operacoes de leitura/escrita foram interrompidas pela quota do plano Starter. Assim que a quota resetar ou o plano permitir mais chamadas, esta especificacao deve ser aplicada diretamente no arquivo `TCC`.
