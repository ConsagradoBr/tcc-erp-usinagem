import { SolIcon, LuaMinguanteIcon } from "../assets/assets-map";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded-lg hover:bg-gray-100"
    >
      <img
        src={dark ? SolIcon : LuaMinguanteIcon}
        alt="Tema"
        className="w-6"
      />
    </button>
  );
}
