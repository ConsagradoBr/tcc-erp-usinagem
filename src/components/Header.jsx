import { MenuIcon, Poder, Logo } from "../assets/assets-map";
import { useState } from "react";

export default function Header({ onMenuToggle }) {
  return (
    <header className="w-full h-16 bg-white flex items-center justify-between px-6 border-b shadow-sm">

      {/* Botão de menu */}
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <img src={MenuIcon} alt="Menu" className="w-7" />
      </button>

      {/* Logo */}
      <img src={Logo} alt="Logo" className="w-32" />

      {/* Botão logout */}
      <button
        onClick={() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}
        className="p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <img src={Poder} alt="Logout" className="w-6" />
      </button>
    </header>
  );
}
