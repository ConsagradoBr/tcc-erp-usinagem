# Rotas e Navegação - AMP Usinagem Industrial

Referência oficial das rotas usadas na apresentação do MVP.

## Rotas Públicas

```text
/                    -> redireciona para /login
/login               -> login oficial
```

O fluxo oficial não possui cadastro público, rota de Notas Fiscais ou preview de login. Qualquer tela experimental de autenticação que ainda exista no código não deve ser usada na apresentação nem linkada pela navegação principal.

## Rotas Protegidas

```text
/app                         -> redireciona para /app/dashboard
/app/dashboard               -> dashboard principal
/app/clientes                -> clientes e fornecedores
/app/orcamentos              -> orçamentos comerciais
/app/ordens-servico          -> ordens de serviço
/app/financeiro              -> gestão financeira
/app/usuarios                -> administração de usuários
/app/backup                  -> backup desktop
```

Compatibilidade: `/app/ordemservico` redireciona para `/app/ordens-servico`. Novos links, exemplos e documentação devem usar somente `/app/ordens-servico`.

## Navegação Global

### Header

Arquivo: `src/components/Header.jsx`

- Menu: alterna a sidebar no desktop/mobile
- Tema: sincroniza `amp-theme` no `localStorage`
- Sair: encerra sessão e volta para `/login`

### Sidebar

Arquivo: `src/components/Sidebar.jsx`

Itens oficiais:

| Item | Rota | Permissão |
|------|------|-----------|
| Dashboard | `/app/dashboard` | `dashboard` |
| Clientes | `/app/clientes` | `clientes` |
| Orçamentos | `/app/orcamentos` | `orcamentos` |
| Ordens de Serviço | `/app/ordens-servico` | `ordens_servico` |
| Financeiro | `/app/financeiro` | `financeiro` |
| Usuários | `/app/usuarios` | `usuarios` |
| Backup | `/app/backup` | `backup` |

O menu é filtrado por permissão com `hasPermission(user, item.permissao)`.

## Dashboard

Arquivo: `src/pages/Dashboard.jsx`

O Dashboard é o hub central após login. Os links de apresentação devem apontar para:

```jsx
navigate("/app/clientes");
navigate("/app/financeiro");
navigate("/app/orcamentos");
navigate("/app/ordens-servico");
navigate("/app/usuarios");
navigate("/app/backup");
```

## Fluxo de Autenticação

```text
/login
  -> POST /auth/login
  -> persistSession(token, user)
  -> getDefaultAppRoute(user)
  -> /app/dashboard
```

O backend também pode exigir bootstrap do primeiro administrador. Esse fluxo deve continuar dentro da tela oficial `/login`.

## API Frontend

Arquivo: `src/api.js`

O cliente Axios usa:

```text
VITE_API_BASE_URL ou http://127.0.0.1:5000
```

Como as chamadas usam uma base absoluta, o Vite não precisa de proxy local `/api`.

## Mapeamento Completo

| Página | Rota oficial | Componente | Tipo |
|--------|--------------|------------|------|
| Login | `/login` | `AuthPage` | pública |
| Dashboard | `/app/dashboard` | `Dashboard` | protegida |
| Clientes | `/app/clientes` | `Clientes` | protegida |
| Orçamentos | `/app/orcamentos` | `Orcamentos` | protegida |
| Ordens de Serviço | `/app/ordens-servico` | `OrdemServico` | protegida |
| Financeiro | `/app/financeiro` | `Financeiro` | protegida |
| Usuários | `/app/usuarios` | `Usuarios` | protegida |
| Backup | `/app/backup` | `BackupDesktop` | protegida |

## Arquivos Gerados

Não incluir no zip ou na revisão de apresentação:

- `node_modules/`
- `dist/`
- `build/`
- `release/`
- `__pycache__/`
- `.pytest_cache/`
- caches locais equivalentes

Esses diretórios podem existir localmente e devem ser recriados pelos comandos de instalação, build ou empacotamento.

## Referências

- `src/routes.jsx`
- `src/components/Header.jsx`
- `src/components/Sidebar.jsx`
- `src/pages/Dashboard.jsx`
- `src/auth.js`
