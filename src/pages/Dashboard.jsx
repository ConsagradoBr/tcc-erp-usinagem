import {
  Dashboard,
  Clientes,
  Financeiro,
  OrdemServico,
  Dolar,
  DolarAlt,
} from "../assets/assets-map";

export default function Dashboard() {
  return (
    <div className="w-full">

      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white shadow rounded-xl p-6 flex items-center gap-4">
          <img src={Clientes} className="w-12" />
          <div>
            <p className="text-gray-500 text-sm">Clientes</p>
            <p className="text-2xl font-bold">140</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-xl p-6 flex items-center gap-4">
          <img src={OrdemServico} className="w-12" />
          <div>
            <p className="text-gray-500 text-sm">O.S. em andamento</p>
            <p className="text-2xl font-bold">32</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-xl p-6 flex items-center gap-4">
          <img src={Dolar} className="w-12" />
          <div>
            <p className="text-gray-500 text-sm">Receita mensal</p>
            <p className="text-2xl font-bold">R$ 28.900</p>
          </div>
        </div>

      </div>
    </div>
  );
}
