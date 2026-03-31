# AMP V2 - Mapa Mestre de Convergencia

## Objetivo

Definir uma versao oficial unificada da AMP Usinagem a partir de tres fontes:

- o **Figma inicial do TCC**, que traz a identidade visual e a simplicidade desejada
- o **sistema atual**, que ja concentra a maior parte da logica real do produto
- o **TCC escrito**, que precisa narrar com fidelidade o que o projeto entrega

Este documento nao implementa mudancas. Ele trava a direcao oficial que deve orientar o redesenho do Figma, a revisao do `.docx` e a evolucao do sistema.

## Verdades Atuais

### 1. O Figma

O arquivo `TCC` traz uma base visual clara e coerente:

- login com composicao leve, ampla e limpa
- dashboard/menu muito minimalista
- financeiro light e dark com tabela simples e forte
- sidebar compacta e sidebar expandida
- identidade AMP em `branco + preto + laranja`
- alternancia dark/light ja prevista no desenho

Frames validados:

- `Login` (`136:3`)
- `Menu Light` (`44:7`)
- `Financeiro light` (`233:19`)
- `Financeiro Dark` (`267:86`)
- `SideBar Extended light mode` (`71:4`)

### 2. O sistema

O sistema real ja entregou mais escopo do que o Figma inicial:

- dashboard
- clientes
- financeiro
- ordem de servico
- orcamentos
- usuarios
- backup
- host desktop nativo
- modo dark/light real

Em contrapartida, o sistema ficou visualmente mais denso e mais complexo do que o Figma inicial.

### 3. O TCC escrito

O `.docx` ainda descreve uma versao anterior e parcialmente inconsistente do projeto:

- fala em `clientes/fornecedores`
- fala em `N8N` em alguns trechos
- trata `OS` como futuro em outros trechos
- nao reflete bem a distribuicao desktop
- ainda nao separa com clareza arquitetura web e runtime local

## O Que Esta Alinhado

### Figma + sistema

- identidade AMP
- estrutura com sidebar
- light/dark como conceito de produto
- login como porta de entrada forte
- financeiro como tela operacional central

### Sistema + TCC

- React/Vite no frontend
- Flask no backend
- foco em usinagem
- clientes com importacao de NF-e
- financeiro com parcelamento, juros e leitura de boleto
- dashboard como modulo central

### Figma + TCC

- proposta visual clara para banca
- linguagem academica mais controlada e menos "produto inchado"
- escopo original centrado em login, dashboard e financeiro

## O Que Esta Fora

### Figma x sistema

- o Figma e mais leve, mais limpo e mais academico
- o sistema esta mais forte em logica, mas fala demais visualmente
- o Figma mostra `Clientes Fornecedores` e `NF's` como modulos separados
- o sistema atual usa outra divisao de informacao e ja tem OS, orcamentos, usuarios e backup

### TCC x sistema

- o texto ainda cita `N8N`, mas a automacao real esta nativa no backend
- o texto trata OS como futuro, mas o sistema ja entrega OS
- o texto fala em `clientes/fornecedores`, mas hoje nao existe modulo dedicado de fornecedores
- o texto assume `PostgreSQL/Supabase` como narrativa unica, enquanto o produto tambem roda em SQLite local no desktop
- o texto ainda nao conta a historia do app desktop como parte madura da entrega

### Figma x TCC

- o Figma conversa melhor com a proposta visual do TCC do que o sistema atual
- o TCC nao reflete que o prototipo inicial evoluiu bastante
- o TCC precisa parar de falar de "prototipo inicial" como se fosse a foto final do produto

## Decisao Oficial de Escopo

Esta passa a ser a versao oficial proposta para a AMP V2:

### Modulos principais

- Dashboard
- Clientes e Fornecedores
- Orcamentos
- Ordem de Servico
- Financeiro
- Usuarios
- Backup

### Regras de escopo

- `Clientes` deve evoluir para um hub de relacionamento com suporte a **fornecedores**
- `NF's` nao deve existir como modulo isolado por padrao
- dados fiscais devem viver dentro dos fluxos de clientes, fornecedores e financeiro
- login social (`Google`, `Facebook`, `Apple`) sai da versao oficial
- signup publico sai da versao oficial
- `N8N` sai da narrativa oficial

## Decisao Oficial de Arquitetura

### Narrativa tecnica oficial

- Frontend: React + Vite
- Backend: Flask
- Banco principal da arquitetura web: PostgreSQL/Supabase
- Runtime local/desktop: SQLite como fallback operacional
- Distribuicao: aplicativo desktop nativo para Windows

### Como explicar isso no TCC

Nao tratar isso como contradicao. A narrativa correta e:

- a arquitetura principal do sistema foi pensada para ambiente web com PostgreSQL/Supabase
- para distribuicao local e demonstracao desktop, o sistema suporta persistencia local com SQLite
- a mesma base funcional pode operar em modo hospedado ou empacotado

## Decisao Oficial de Linguagem Visual

O Figma inicial e a melhor base visual do projeto hoje.

Direcao oficial:

- manter a identidade `preto + branco + laranja`
- preservar a leveza e o espacamento do Figma
- manter dark/light
- evitar excesso de cards
- usar mais silencio visual e menos fragmentacao
- fazer o sistema parecer sofisticado sem ficar inchado

O sistema deve evoluir **em direcao ao Figma**, nao o contrario.

## O Que Cada Artefato Deve Aprender Com o Outro

### O sistema deve aprender com o Figma

- composicao mais leve
- menos ruido
- blocos maiores e mais bem resolvidos
- melhor hierarquia
- mais elegancia com menos elementos

### O Figma deve aprender com o sistema

- logicas reais de clientes, orcamentos, OS e financeiro
- papel de usuarios e backup
- fluxo de parcelamento e importacoes
- estados reais de uso

### O TCC deve aprender com os dois

- contar a verdade do produto atual
- abandonar promessas que nao viraram entrega
- assumir o prototipo inicial como base, nao como retrato final
- registrar a evolucao do projeto como amadurecimento de escopo

## O Que Fica, Sai e Entra

### Fica

- identidade AMP
- dark/light
- login forte
- dashboard como centro de comando
- financeiro como nucleo operacional
- distribuicao desktop

### Sai

- `N8N`
- social login
- signup publico
- `NF's` como modulo principal isolado
- conclusao do TCC tratando OS como futuro

### Entra

- fornecedores integrados ao dominio de relacionamento
- narrativa de desktop nativo
- explicacao clara de banco web + banco local
- convergencia visual em cima do Figma
- convergencia funcional em cima do sistema

## Sequencia Recomendada de Execucao

### Etapa 1 - Travar a verdade oficial

- aprovar este mapa como base do projeto

### Etapa 2 - Revisar o TCC

- reescrever introducao, objetivos, arquitetura, resultados e conclusao
- remover incoerencias
- alinhar o texto ao produto entregue

### Etapa 3 - Evoluir o Figma

- criar a versao consolidada do produto
- incorporar OS, orcamentos, usuarios, backup e fornecedores
- manter a leveza visual como norte

### Etapa 4 - Evoluir o sistema

- aproximar layout, hierarquia e espacamento do Figma consolidado
- sem perder a logica madura que o sistema ja conquistou

## Veredito

Nao vale a pena refazer tudo do zero.

Vale a pena construir uma **AMP V2 unificada**, onde:

- o **Figma** define a experiencia
- o **sistema** define a maturidade funcional
- o **TCC** define a narrativa final correta

Essa e a melhor forma de transformar o projeto em algo mais forte, mais coerente e mais defendivel.
