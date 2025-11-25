import { createBrowserRouter } from "react-router-dom";

// Layouts
import PublicLayout from "./layouts/PublicLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";

// Auth
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";

// Internas
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Financeiro from "./pages/Financeiro";
import OrdemServico from "./pages/OrdemServico";
import NFs from "./pages/NFs";
import Home from "./pages/Home";

const routes = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { path: "login", element: <Login /> },
      { path: "signup", element: <SignUp /> },
    ],
  },
  {
    path: "/app",
    element: <ProtectedLayout />,
    children: [
      { path: "", element: <Home /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "clientes", element: <Clientes /> },
      { path: "financeiro", element: <Financeiro /> },
      { path: "ordemservico", element: <OrdemServico /> },
      { path: "nfs", element: <NFs /> },
    ],
  },
]);

export default routes;
