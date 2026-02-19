import { IconServiceOrder, IconCalendar, IconFilter } from "../assets/assets-map";

export default function OrdemServico() {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Ordem de Serviço</h1>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-gray-200 rounded-lg flex items-center gap-2">
            <img src={IconFilter} className="w-5" /> Filtrar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Nova O.S.</button>
        </div>
      </div>
      {/* ... conteúdo ... */}
    </div>
  );
}