# AMP V2 - Sequencia de Montagem no Figma

## Objetivo

Transformar a especificacao da AMP V2 em um roteiro executavel dentro do arquivo Figma `TCC`, sem depender de reinterpretacao conceitual no momento da aplicacao.

Este documento existe para responder a pergunta:

- `quando a quota liberar, em que ordem montar a versao consolidada?`

Ele deve ser lido em conjunto com:

- [amp-convergencia-v2.md](/d:/AMP-Usinagem-Industrial/tcc-erp-usinagem/docs/tcc/amp-convergencia-v2.md)
- [amp-figma-v2-consolidation.md](/d:/AMP-Usinagem-Industrial/tcc-erp-usinagem/docs/design/amp-figma-v2-consolidation.md)
- [amp-figma-v2-screen-specs.md](/d:/AMP-Usinagem-Industrial/tcc-erp-usinagem/docs/design/amp-figma-v2-screen-specs.md)

## Premissas

- o arquivo historico `TCC` deve ser preservado
- a versao nova deve nascer em uma pagina propria
- o sistema real e a verdade funcional
- o Figma inicial e a verdade de leveza e linguagem
- a AMP V2 nao deve parecer outro produto

## Resultado esperado

Ao final da montagem, o Figma deve ter uma pagina `AMP V2 Consolidado` com:

- fundacoes
- dashboard
- operacao
- administracao
- light e dark
- modulos ja alinhados com o sistema e com o TCC

## Nomenclatura oficial

### Pagina

- `AMP V2 Consolidado`

### Secoes

- `00 - Fundacoes`
- `01 - Dashboard`
- `02 - Operacao`
- `03 - Administracao`
- `99 - Arquivo / Historico`

### Frames

Usar sempre o formato:

- `<Tela> / <Tema> / V2`

Exemplos:

- `Login / Light / V2`
- `Dashboard / Dark / V2`
- `Clientes e Fornecedores / Light / V2`

## Mapa de reaproveitamento do arquivo atual

| Origem no Figma atual | Node | Destino na V2 | Acao |
| --- | --- | --- | --- |
| Login | `136:3` | `Login / Light / V2` | Duplicar e limpar |
| Menu Light | `44:7` | base de dashboard e navegacao light | Duplicar e reestruturar |
| Financeiro light | `233:19` | `Financeiro / Light / V2` | Duplicar e consolidar |
| Financeiro Dark | `267:86` | `Financeiro / Dark / V2` | Duplicar e consolidar |
| SideBar Extended light mode | `71:4` | sidebars e foundations light | Duplicar e modularizar |

## Sequencia oficial de montagem

### Fase 1 - Estrutura da pagina

1. Criar a pagina `AMP V2 Consolidado`
2. Criar as secoes:
   - `00 - Fundacoes`
   - `01 - Dashboard`
   - `02 - Operacao`
   - `03 - Administracao`
3. Mover qualquer exploracao temporaria para `99 - Arquivo / Historico`

### Fase 2 - Fundacoes

Objetivo:

- travar a linguagem visual antes de multiplicar telas

Montar nesta ordem:

1. `Sidebar / Compact / Light / V2`
2. `Sidebar / Compact / Dark / V2`
3. `Sidebar / Expanded / Light / V2`
4. `Sidebar / Expanded / Dark / V2`
5. `Topbar / Light / V2`
6. `Topbar / Dark / V2`
7. `Login / Light / V2`
8. `Login / Dark / V2`

Regras:

- nao desenhar barra de janela falsa
- considerar frame nativo do Windows fora da interface
- topo interno deve parecer toolbar de produto
- luz, espacamento e ritmo devem vir do Figma inicial, nao do sistema atual

### Fase 3 - Dashboard

Objetivo:

- criar a tela que define o tom do produto

Montar:

1. `Dashboard / Light / V2`
2. `Dashboard / Dark / V2`

Concentrar em:

- hero principal
- 4 a 6 blocos maximo em primeiro contato
- leitura `cliente -> orcamento -> OS -> financeiro`
- proximas acoes
- saude financeira
- estado da producao

Nao permitir:

- mosaico inchado
- mais de um painel brigando por protagonismo
- repeticao de usuario em varios pontos da mesma tela

### Fase 4 - Operacao

Objetivo:

- consolidar o miolo do produto

Montar nesta ordem:

1. `Clientes e Fornecedores / Light / V2`
2. `Clientes e Fornecedores / Dark / V2`
3. `Orcamentos / Light / V2`
4. `Orcamentos / Dark / V2`
5. `OS / Light / V2`
6. `OS / Dark / V2`
7. `Financeiro / Light / V2`
8. `Financeiro / Dark / V2`

Motivo da ordem:

- relacionamento primeiro
- comercial depois
- operacao em seguida
- financeiro fechando o fluxo

### Fase 5 - Administracao

Objetivo:

- completar a versao apresentada como produto maduro

Montar:

1. `Usuarios / Light / V2`
2. `Usuarios / Dark / V2`
3. `Backup / Light / V2`
4. `Backup / Dark / V2`

### Fase 6 - Revisao transversal

Verificar:

- consistencia do menu
- consistencia de light/dark
- consistencia tipografica
- contraste
- alinhamento com modulos reais do sistema
- remocao de resquicios do escopo antigo

## Checklist por fase

### Fundacoes

- login sem social login
- login sem signup publico
- sidebar sem `NF's`
- sidebar com `Clientes e Fornecedores`
- topbar interna minimalista
- identidade AMP mantida

### Dashboard

- menos fragmentacao que o sistema atual
- mais contexto que o prototipo inicial
- hero forte sem exagero
- cards com funcao clara
- sem ruido duplicado

### Operacao

- `Clientes e Fornecedores` unificados
- `Orcamentos` com ponte para OS e financeiro
- `OS` com leitura operacional clara
- `Financeiro` com tabela como espinha dorsal
- dados fiscais embutidos no dominio, nao como modulo isolado

### Administracao

- `Usuarios` reforca acesso controlado
- `Backup` reforca confiabilidade e distribuicao desktop

## Definicao de pronto

O Figma consolidado estara pronto quando:

- todos os modulos oficiais existirem em light e dark
- a estrutura visual estiver mais proxima do Figma inicial do que do sistema atual
- os fluxos principais do sistema real estiverem representados
- o TCC puder usar essas telas como versao oficial do produto
- nao houver dependencias do escopo antigo para explicar a interface

## Aplicacao futura via MCP

Quando a quota liberar, a aplicacao deve seguir esta ordem:

1. criar pagina `AMP V2 Consolidado`
2. duplicar os frames-base do arquivo atual
3. montar fundacoes
4. montar dashboard
5. montar operacao
6. montar administracao
7. revisar tudo contra o sistema real

## Veredito

Nao devemos usar a quota futura para descobrir o que fazer.

Devemos usar a quota futura apenas para executar este plano.
