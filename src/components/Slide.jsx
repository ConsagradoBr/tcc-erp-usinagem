import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Slide({ isOpen, onClose }) {
  const slideRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={slideRef}
      onMouseLeave={onClose}
      className="fixed left-[6.5%] top-0 z-50 h-screen w-[22%] min-w-[240px] max-w-[420px]
      bg-white rounded-r-2xl shadow-lg flex flex-col items-start p-6 text-orange-600 font-bold
      transition-transform duration-300"
    >
      <div className="w-full mb-6">
        <img src="/assets/logo_menu.png" alt="logo" style={{ width: "70%", paddingLeft: "10%" }} />
      </div>

      <div className="w-full space-y-4 flex-1">
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">
            Financeiro <img src="/assets/finaceiro.png" className="w-5 h-5" />
          </p>
        </div>
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">
            Clientes / Fornecedores <img src="/assets/clientes.png" className="w-5 h-5" />
          </p>
        </div>
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">
            Painel <img src="/assets/Dashboard.png" className="w-5 h-5" />
          </p>
        </div>
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">
            Ordem de Serviço <img src="/assets/Ordem_sevico.png" className="w-5 h-5" />
          </p>
        </div>
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">
            NF's <img src="/assets/NFs.png" className="w-5 h-5" />
          </p>
        </div>
      </div>

      <div className="w-full mt-2 flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <button className="flex items-center gap-2 bg-gray-200 rounded-md px-3 py-1">
            <img src="/assets/sol (1) 1.png" className="w-4 h-4" /> Claro
          </button>
          <button className="flex items-center gap-2 bg-gray-200 rounded-md px-3 py-1">
            <img src="/assets/lua-minguante 1.png" className="w-4 h-4" /> Escuro
          </button>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="bg-white border rounded-full p-2 shadow-md"
          aria-label="logout"
        >
          <img src="/assets/poder 1.png" className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
