const TOKEN_KEY = "token";
const USER_KEY = "amp_user";

export const PERFIS_SISTEMA = {
  administrador: {
    label: "Administrador",
    permissoes: ["dashboard", "clientes", "financeiro", "ordens_servico", "orcamentos", "backup", "usuarios"],
  },
  financeiro: {
    label: "Financeiro",
    permissoes: ["dashboard", "clientes", "financeiro"],
  },
  producao: {
    label: "Produção",
    permissoes: ["dashboard", "ordens_servico"],
  },
  comercial: {
    label: "Comercial",
    permissoes: ["dashboard", "clientes", "orcamentos"],
  },
};

export const ROUTE_PERMISSIONS = [
  { prefix: "/app/dashboard", permissao: "dashboard" },
  { prefix: "/app/clientes", permissao: "clientes" },
  { prefix: "/app/financeiro", permissao: "financeiro" },
  { prefix: "/app/ordemservico", permissao: "ordens_servico" },
  { prefix: "/app/orcamentos", permissao: "orcamentos" },
  { prefix: "/app/backup", permissao: "backup" },
  { prefix: "/app/usuarios", permissao: "usuarios" },
];

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function persistSession(token, user) {
  setStoredToken(token);
  setStoredUser(user);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getPermissions(user) {
  if (!user) return [];
  if (Array.isArray(user.permissoes) && user.permissoes.length) return user.permissoes;
  return PERFIS_SISTEMA[user.perfil]?.permissoes || [];
}

export function hasPermission(user, permissao) {
  return getPermissions(user).includes(permissao);
}

export function canAccessPath(user, pathname) {
  if (!pathname.startsWith("/app")) return true;
  const regra = ROUTE_PERMISSIONS.find((item) => pathname.startsWith(item.prefix));
  if (!regra) return true;
  return hasPermission(user, regra.permissao);
}

export function getDefaultAppRoute(user) {
  const ordered = [
    ["dashboard", "/app/dashboard"],
    ["clientes", "/app/clientes"],
    ["financeiro", "/app/financeiro"],
    ["ordens_servico", "/app/ordemservico"],
    ["orcamentos", "/app/orcamentos"],
    ["backup", "/app/backup"],
    ["usuarios", "/app/usuarios"],
  ];
  const found = ordered.find(([perm]) => hasPermission(user, perm));
  return found?.[1] || "/login";
}

export function getProfileLabel(perfil) {
  return PERFIS_SISTEMA[perfil]?.label || perfil || "Perfil";
}
