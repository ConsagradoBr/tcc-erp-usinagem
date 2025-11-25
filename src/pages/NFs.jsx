import { FiltroIcon, CalendarioIcon } from "../assets/assets-map";

export default function NFs() {
  return (
    <div className="w-full">

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Notas Fiscais</h1>

      <div className="flex items-center gap-4 mb-6">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
          <img src={FiltroIcon} className="w-5" /> Filtrar
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
          <img src={CalendarioIcon} className="w-5" /> Data
        </button>
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        <p className="text-gray-500 text-center">Nenhuma nota fiscal encontrada.</p>
      </div>

    </div>
  );
}
