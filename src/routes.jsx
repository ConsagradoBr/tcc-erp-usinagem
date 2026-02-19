import { createBrowserRouter, Navigate } from "react-router-dom"; // Importe o Navigate
import PublicLayout from "./layouts/PublicLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";

import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Financeiro from "./pages/Financeiro";
import OrdemServico from "./pages/OrdemServico";
import NFs from "./pages/NFs";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";

const routes = createBrowserRouter(
  [
    {
      path: "/",
      element: <PublicLayout />,
      children: [
        { index: true, element: <Navigate to="/login" replace /> },
        { path: "login", element: <AuthPage /> }, 
        { path: "signup", element: <AuthPage /> }, 
      ],
    },
    {
      path: "/app",
      element: <ProtectedLayout />,
      children: [
        { path: "dashboard", element: <Dashboard /> },
        { path: "clientes", element: <Clientes /> },
        { path: "financeiro", element: <Financeiro /> },
        { path: "ordemservico", element: <OrdemServico /> },
        { path: "nfs", element: <NFs /> },
        { path: "", element: <Home /> },
      ],
    },
    // Rota de "Catch-all": se o usuário digitar qualquer URL inexistente, volta para o login
    { path: "*", element: <Navigate to="/login" replace /> },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  }
);

export default routes;