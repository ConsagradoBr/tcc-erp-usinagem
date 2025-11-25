import {
  OrdemServicoIcon,
  CalendarioIcon,
  FiltroIcon,
} from "../assets/assets-map";

export default function OrdemServico() {
  return (
    <div className="w-full">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Ordem de Serviço</h1>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center gap-2">
            <img src={FiltroIcon} className="w-5" /> Filtrar
          </button>

          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Nova O.S.
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        <p className="text-gray-500 text-center">Nenhuma ordem cadastrada.</p>
      </div>

    </div>
  );
}
