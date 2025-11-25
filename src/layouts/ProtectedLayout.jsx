import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  // Proteção da rota → se não tiver token, voltar ao login
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  const toggleMenu = () => setOpen(!open);

  return (
    <div className="flex w-full min-h-screen bg-gray-100">

      {/* SIDEBAR */}
      <Sidebar open={open} />

      {/* ÁREA PRINCIPAL */}
      <div
        className={`
          flex flex-col flex-1 transition-all duration-300
          ${open ? "ml-64" : "ml-16"}
        `}
      >

        {/* HEADER */}
        <Header onMenuToggle={toggleMenu} />

        {/* CONTEÚDO ONDE AS TELAS APARECEM */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
