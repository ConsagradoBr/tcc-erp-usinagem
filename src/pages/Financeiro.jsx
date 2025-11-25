import {
  FinanceiroIcon,
  CalendarioIcon,
  CalendarioAlt,
  FiltroIcon,
  FiltroAlt,
  PagamentoVermelho,
  Dolar,
} from "../assets/assets-map";

export default function Financeiro() {
  return (
    <div className="w-full">

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Financeiro</h1>

      <div className="bg-white p-6 shadow rounded-xl">
        <div className="flex items-center gap-4 mb-6">

          <div className="flex items-center gap-2">
            <img src={CalendarioIcon} className="w-6" />
            <span>Filtrar por data</span>
          </div>

          <div className="flex items-center gap-2">
            <img src={FiltroIcon} className="w-6" />
            <span>Avançado</span>
          </div>

        </div>

        <table className="w-full mt-4">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="p-2">Descrição</th>
              <th className="p-2">Valor</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-t">
              <td className="p-2">Pagamento de cliente</td>
              <td className="p-2 text-green-600 font-bold">R$ 1.200</td>
              <td className="p-2">
                <img src={Dolar} className="w-6" />
              </td>
            </tr>

            <tr className="border-t">
              <td className="p-2">Pagar fornecedor</td>
              <td className="p-2 text-red-600 font-bold">R$ -800</td>
              <td className="p-2">
                <img src={PagamentoVermelho} className="w-6" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
