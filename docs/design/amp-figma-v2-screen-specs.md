# AMP V2 - Especificacao Tela por Tela

## Objetivo

Detalhar como cada tela da AMP V2 deve ser desenhada no Figma, unindo:

- a leveza do prototipo inicial
- a maturidade funcional do sistema atual
- a narrativa final validada para o TCC

## Regras globais

### Regras de experiencia

- o frame nativo do Windows fica fora da UI
- o topo interno e uma toolbar de produto, nao uma barra de janela
- a interface deve parecer premium, mas simples
- a informacao mais importante deve aparecer antes da informacao mais completa
- tabelas e paines devem respirar
- dark e light devem ser equivalentes, nao apenas invertidos

### Regras de composicao

- evitar excesso de cards pequenos
- preferir blocos maiores e mais resolvidos
- evitar mais de 3 niveis de destaque na mesma viewport
- usar o laranja AMP apenas para navegacao, acao e estado relevante
- usar preto e off-white como estrutura

### Regras de conteudo

- sem login social
- sem signup publico
- sem `NF's` como modulo principal
- `Clientes` e `Fornecedores` unidos no mesmo dominio
- `OS` e `Orcamentos` tratados como parte oficial do produto

## 1. Login

### Frames

- `Login / Light / V2`
- `Login / Dark / V2`

### Objetivo

Apresentar o sistema de forma institucional, limpa e madura.

### Estrutura

- grande area de marca e atmosfera
- coluna de autenticacao clara
- titulo forte
- subtitulo institucional
- formulario simples
- mensagem de acesso controlado

### Deve conter

- campo de e-mail
- campo de senha
- botao principal de entrada
- aviso de que novos usuarios dependem de administrador

### Deve remover

- `Facebook`
- `Google`
- `Apple`
- CTA de cadastro publico

### O que puxar do sistema

- texto institucional alinhado com acesso interno
- leitura de app desktop

## 2. Sidebar e Topbar

### Frames

- `Sidebar / Compact / Light / V2`
- `Sidebar / Compact / Dark / V2`
- `Sidebar / Expanded / Light / V2`
- `Sidebar / Expanded / Dark / V2`
- `Topbar / Light / V2`
- `Topbar / Dark / V2`

### Objetivo

Criar a linguagem estrutural do produto inteiro.

### Sidebar

Deve conter:

- Dashboard
- Clientes e Fornecedores
- Orcamentos
- Ordem de Servico
- Financeiro
- Usuarios
- Backup
- usuario no rodape
- saida

Deve evitar:

- labels excessivas
- duplicacao de info do usuario
- item `NF's`

### Topbar

Deve conter:

- identidade AMP discreta
- contexto da tela
- acao global quando fizer sentido
- seletor de tema light/dark

Deve evitar:

- parecer barra de janela
- repetir dados de usuario em excesso

## 3. Dashboard

### Frames

- `Dashboard / Light / V2`
- `Dashboard / Dark / V2`

### Objetivo

Ser o centro de comando do produto, com leveza e autoridade.

### Estrutura

- hero principal
- bloco de leitura financeira
- bloco de andamento produtivo
- bloco de proximas acoes
- bloco de conexao do fluxo principal

### Conteudos obrigatorios

- resumo de clientes ativos
- orcamentos ativos ou aprovados
- ordens em fluxo
- valor a receber
- saude financeira
- leitura de producao
- proximas acoes acionaveis

### Limites

- no maximo 6 blocos relevantes acima da dobra
- evitar grid fragmentada demais
- evitar repetir a mesma metrica em blocos diferentes

### O que puxar do sistema

- cadeia `cliente -> orcamento -> OS -> financeiro`
- proximas acoes reais
- visao de producao e visao financeira no mesmo ecossistema

### O que puxar do Figma inicial

- leveza
- areas grandes
- composicao limpa
- menos barulho

## 4. Clientes e Fornecedores

### Frames

- `Clientes e Fornecedores / Light / V2`
- `Clientes e Fornecedores / Dark / V2`

### Objetivo

Transformar relacionamento em um dominio unico.

### Estrutura

- topo com chave `Clientes | Fornecedores`
- busca principal
- filtros por perfil e situacao
- tabela/lista principal
- painel lateral de detalhe ou area de foco
- acoes principais do registro

### Conteudos obrigatorios

- nome / razao social
- documento
- contato
- status do cadastro
- vinculo comercial
- contexto financeiro
- dados fiscais incorporados

### O que precisa existir para fornecedores

- classificacao de parceiro
- contato e documento
- relacao com compras/servicos
- espaco para dados fiscais

### O que nao fazer

- criar duas telas separadas quase identicas
- tratar fornecedor como nota de rodape

## 5. Orcamentos

### Frames

- `Orcamentos / Light / V2`
- `Orcamentos / Dark / V2`

### Objetivo

Representar o modulo comercial e sua ponte para operacao.

### Estrutura

- filtros de status
- lista ou tabela de orcamentos
- painel de foco
- estados comerciais bem claros

### Conteudos obrigatorios

- cliente
- data
- validade
- valor
- status
- origem
- proxima acao
- indicacao de transicao para OS
- indicacao de reflexo no financeiro

### O que puxar do sistema

- aprovacao
- conversao operacional
- leitura comercial

## 6. Ordem de Servico

### Frames

- `OS / Light / V2`
- `OS / Dark / V2`

### Objetivo

Representar a operacao com clareza, nao apenas com visual bonito.

### Estrutura

- quadro de status ou board principal
- filtros por prioridade e etapa
- cards ou linhas operacionais mais compactos
- painel de foco quando necessario

### Conteudos obrigatorios

- numero da OS
- cliente
- origem do orcamento
- etapa atual
- prioridade
- previsao
- responsavel

### Regras de desenho

- o board deve ser manuseavel visualmente
- todas as colunas principais devem caber com dignidade
- `Em andamento` nao pode quebrar a padronizacao dos demais titulos

## 7. Financeiro

### Frames

- `Financeiro / Light / V2`
- `Financeiro / Dark / V2`

### Objetivo

Manter a melhor base do arquivo atual e incorporar a maturidade do sistema.

### Estrutura

- barra de acoes
- filtros
- tabela principal
- status claros
- modais derivados depois, se necessario

### Conteudos obrigatorios

- tipo
- descricao
- cliente/fornecedor
- vencimento
- valor
- status
- parcelas
- juros
- origem
- contexto de vinculo

### Regras de desenho

- a tabela e a espinha dorsal
- os estados devem ser muito claros
- a tela deve permanecer sobria
- dark e light devem ser equivalentes em utilidade

## 8. Usuarios

### Frames

- `Usuarios / Light / V2`
- `Usuarios / Dark / V2`

### Objetivo

Mostrar governanca interna e controle de acesso.

### Estrutura

- lista de usuarios
- perfil
- papel
- estado de acesso
- acoes administrativas

### Mensagem central

- o sistema e controlado por administracao
- nao existe cadastro publico liberado

## 9. Backup

### Frames

- `Backup / Light / V2`
- `Backup / Dark / V2`

### Objetivo

Passar confiabilidade operacional.

### Estrutura

- historico de backups
- acoes de gerar, exportar e restaurar
- mensagens de seguranca
- leitura enxuta e tecnica

### O que puxar do sistema

- narrativa de confiabilidade
- leitura de desktop local

## 10. Tema Light e Dark

### Light

- principal modo de apresentacao para a banca
- base clara ampla
- preto como ancora
- laranja para destaque relevante

### Dark

- equivalente premium
- nao exagerar em brilho
- preservar legibilidade de tabelas e formularios

## 11. Criterios de aprovacao do Figma consolidado

Uma tela so entra como pronta quando:

- representa um modulo real do sistema
- conversa com o TCC revisado
- preserva a assinatura do arquivo inicial
- esta mais leve do que o sistema atual
- esta mais madura do que o prototipo inicial

## Veredito

O Figma V2 precisa parecer a versao que o prototipo inicial queria ser, agora sustentada por uma logica de produto real.
