import React from "react";
import { IconMenu, IconPower, LogoMain } from "../assets/assets-map";

export default function Header({ onMenuToggle }) {
  return (
    <header className="w-full h-16 bg-white flex items-center justify-between px-6 border-b shadow-sm">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <img src={IconMenu} alt="Menu" className="w-7" />
      </button>

      <img src={LogoMain} alt="Logo" className="w-32" />

      <button
        onClick={() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}
        className="p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <img src={IconPower} alt="Logout" className="w-6" />
      </button>
    </header>
  );
}