import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const OrdemServico = lazy(() => import("./pages/OrdemServico"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Home = lazy(() => import("./pages/Home"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const LoginPreview = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const BackupDesktop = lazy(() => import("./pages/BackupDesktop"));

function RouteLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-9 h-9 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
    </div>
  );
}

function screen(Component) {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Component />
    </Suspense>
  );
}

const routes = createBrowserRouter(
  [
    {
      path: "/",
      element: <PublicLayout />,
      children: [
        { index: true, element: <Navigate to="/login" replace /> },
        { path: "login", element: screen(LoginPreview) },
        { path: "login-preview", element: screen(LoginPreview) },
        { path: "signup", element: screen(SignUp) },
      ],
    },
    {
      path: "/app",
      element: <ProtectedLayout />,
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: "dashboard", element: screen(Dashboard) },
        { path: "clientes", element: screen(Clientes) },
        { path: "orcamentos", element: screen(Orcamentos) },
        { path: "ordemservico", element: screen(OrdemServico) },
        { path: "financeiro", element: screen(Financeiro) },
        { path: "usuarios", element: screen(Usuarios) },
        { path: "backup", element: screen(BackupDesktop) },
        { path: "home", element: screen(Home) },
      ],
    },
    { path: "*", element: <Navigate to="/login" replace /> },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  }
);

export default routes;
