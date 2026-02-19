import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LogoMenu, IconFinance, IconClients, IconDashboard, 
  IconServiceOrder, IconInvoices, IconSun, IconMoon, IconPower 
} from "../assets/assets-map";

export default function Slide({ isOpen, onClose }) {
  const navigate = useNavigate();
  if (!isOpen) return null;

  return (
    <div onMouseLeave={onClose} className="fixed left-[6.5%] top-0 z-50 h-screen w-[22%] min-w-[240px] bg-white rounded-r-2xl shadow-lg flex flex-col p-6 text-orange-600 font-bold">
      <div className="w-full mb-6">
        <img src={LogoMenu} alt="logo" style={{ width: "70%", paddingLeft: "10%" }} />
      </div>

      <div className="w-full space-y-4 flex-1">
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">Financeiro <img src={IconFinance} className="w-5 h-5" /></p>
        </div>
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">Clientes <img src={IconClients} className="w-5 h-5" /></p>
        </div>
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">Painel <img src={IconDashboard} className="w-5 h-5" /></p>
        </div>
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">O.S. <img src={IconServiceOrder} className="w-5 h-5" /></p>
        </div>
        <div className="border-b border-dashed border-orange-400 pb-3">
          <p className="flex items-center gap-3">NF's <img src={IconInvoices} className="w-5 h-5" /></p>
        </div>
      </div>

      <div className="w-full mt-2 flex items-center justify-between">
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-gray-200 rounded-md px-3 py-1"><img src={IconSun} className="w-4" /> Claro</button>
          <button className="flex items-center gap-2 bg-gray-200 rounded-md px-3 py-1"><img src={IconMoon} className="w-4" /> Escuro</button>
        </div>
        <button onClick={() => { localStorage.removeItem("token"); navigate("/login"); }} className="bg-white border rounded-full p-2 shadow-md">
          <img src={IconPower} className="w-6" />
        </button>
      </div>
    </div>
  );
}