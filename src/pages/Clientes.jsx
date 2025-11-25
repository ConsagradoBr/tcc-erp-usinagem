import { ClientesIcon, FiltroIcon } from "../assets/assets-map";

export default function Clientes() {
  return (
    <div className="w-full">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>

        <button className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">
          <img src={FiltroIcon} className="w-5" />
          Filtrar
        </button>
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        <p className="text-gray-500 text-center">Nenhum cliente cadastrado ainda.</p>
      </div>

    </div>
  );
}
