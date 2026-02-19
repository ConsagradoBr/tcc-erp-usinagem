import { IconFilter, IconCalendar } from "../assets/assets-map";

export default function NFs() {
  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Notas Fiscais</h1>
      <div className="flex items-center gap-4 mb-6">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg">
          <img src={IconFilter} className="w-5" /> Filtrar
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg">
          <img src={IconCalendar} className="w-5" /> Data
        </button>
      </div>
      {/* ... */}
    </div>
  );
}