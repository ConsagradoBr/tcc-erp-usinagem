import { useState, useRef } from "react";

// Dados fictícios iniciais
const dadosIniciais = [
  {
    id: 1,
    status: "pago",
    cliente: "Cliente X",
    nfe: "852.963",
    prazo: "30-DIAS",
    vencimento: "24/10/2025",
    valor: 100.0,
    juros: 103.35,
  },
  {
    id: 2,
    status: "atrasado",
    cliente: "Cliente X",
    nfe: "852.963",
    prazo: "30-DIAS",
    vencimento: "24/10/2025",
    valor: 150.0,
    juros: 158.82,
  },
  {
    id: 3,
    status: "pago",
    cliente: "Cliente X",
    nfe: "852.963",
    prazo: "45-DIAS",
    vencimento: "09/10/2025",
    valor: 4785.0,
    juros: 5024.52,
  },
  {
    id: 4,
    status: "pago",
    cliente: "Cliente Y",
    nfe: "852.963",
    prazo: "1-DIAS",
    vencimento: "24/09/2025",
    valor: 100.0,
    juros: 103.35,
  },
  {
    id: 5,
    status: "atrasado",
    cliente: "Cliente Y",
    nfe: "852.963",
    prazo: "5-DIAS",
    vencimento: "29/09/2025",
    valor: 100.0,
    juros: 103.35,
  },
  {
    id: 6,
    status: "pago",
    cliente: "Cliente Z",
    nfe: "852.963",
    prazo: "1-DIAS",
    vencimento: "24/09/2025",
    valor: 100.0,
    juros: 103.35,
  },
];

const formatarMoeda = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Financeiro() {
  const [dados, setDados] = useState(dadosIniciais);
  const [filtro, setFiltro] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [notificacao, setNotificacao] = useState(null);
  const fileInputRef = useRef(null);

  // --- Notificação temporária ---
  const mostrarNotificacao = (msg, tipo = "sucesso") => {
    setNotificacao({ msg, tipo });
    setTimeout(() => setNotificacao(null), 3000);
  };

  // --- Filtro ---
  const dadosFiltrados = dados.filter(
    (item) =>
      item.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      item.nfe.includes(filtro)
  );

  // --- Seleção de checkboxes ---
  const toggleSelecionado = (id) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (selecionados.length === dadosFiltrados.length) {
      setSelecionados([]);
    } else {
      setSelecionados(dadosFiltrados.map((i) => i.id));
    }
  };

  // --- Excluir ---
  const excluir = (id) => {
    if (window.confirm("Deseja realmente excluir este registro?")) {
      setDados((prev) => prev.filter((item) => item.id !== id));
      mostrarNotificacao("Registro excluído com sucesso!");
    }
  };

  // --- Abrir modal de edição ---
  const abrirEdicao = (item) => {
    setItemEditando({ ...item });
    setModalAberto(true);
  };

  // --- Salvar edição ---
  const salvarEdicao = () => {
    setDados((prev) =>
      prev.map((item) => (item.id === itemEditando.id ? itemEditando : item))
    );
    setModalAberto(false);
    mostrarNotificacao("Registro atualizado com sucesso!");
  };

  // --- Exportar CSV ---
  const exportarCSV = (item) => {
    const cabecalho = "Status,Cliente,NF-e,Prazo,Vencimento,Valor,Juros\n";
    const linha = `${item.status},${item.cliente},${item.nfe},${item.prazo},${item.vencimento},${item.valor},${item.juros}\n`;
    const blob = new Blob([cabecalho + linha], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro_${item.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarNotificacao("Arquivo exportado!");
  };

  // --- Importar CSV ---
  const importarCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const linhas = ev.target.result.split("\n").filter(Boolean);
      const novos = linhas.slice(1).map((linha, idx) => {
        const [status, cliente, nfe, prazo, vencimento, valor, juros] =
          linha.split(",");
        return {
          id: Date.now() + idx,
          status: status?.trim() || "pago",
          cliente: cliente?.trim() || "",
          nfe: nfe?.trim() || "",
          prazo: prazo?.trim() || "",
          vencimento: vencimento?.trim() || "",
          valor: parseFloat(valor) || 0,
          juros: parseFloat(juros) || 0,
        };
      });
      setDados((prev) => [...prev, ...novos]);
      mostrarNotificacao(`${novos.length} registro(s) importado(s)!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex-1 bg-gray-50 min-h-screen p-6">
      {/* Notificação */}
      {notificacao && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-semibold transition-all ${
            notificacao.tipo === "sucesso" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {notificacao.msg}
        </div>
      )}

      {/* Cabeçalho da página */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7 text-orange-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h1 className="text-xl font-bold tracking-widest text-gray-700 uppercase">
          Financeiro
        </h1>
      </div>

      {/* Barra de filtro */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-600 uppercase tracking-wide">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
            />
          </svg>
          Filter
        </div>

        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por cliente ou NF-e..."
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

        <button
          onClick={() => setFiltro(filtro)}
          className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Apply
        </button>

        <button
          onClick={() => fileInputRef.current.click()}
          className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={importarCSV}
        />
      </div>

      {/* Tabela */}
      <div className="rounded-lg overflow-hidden shadow border border-gray-200">
        <table className="w-full text-sm">
          {/* Cabeçalho laranja */}
          <thead>
            <tr className="bg-orange-500 text-white text-xs uppercase tracking-wider">
              <th className="px-3 py-3 text-left w-8">
                <input
                  type="checkbox"
                  checked={
                    selecionados.length === dadosFiltrados.length &&
                    dadosFiltrados.length > 0
                  }
                  onChange={toggleTodos}
                  className="accent-white cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Cliente</th>
              <th className="px-4 py-3 text-center">NF-e</th>
              <th className="px-4 py-3 text-center">Prazo</th>
              <th className="px-4 py-3 text-center">Data de Vencimento</th>
              <th className="px-4 py-3 text-center">Valor</th>
              <th className="px-4 py-3 text-center">Juros</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>

          {/* Corpo da tabela */}
          <tbody>
            {dadosFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-10 text-gray-400 bg-white"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              dadosFiltrados.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`border-t border-gray-100 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-orange-50 transition`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(item.id)}
                      onChange={() => toggleSelecionado(item.id)}
                      className="accent-orange-500 cursor-pointer"
                    />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {item.status === "pago" ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </span>
                    )}
                  </td>

                  {/* Dados */}
                  <td className="px-4 py-3 text-center text-gray-700 font-medium">
                    {item.cliente}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {item.nfe}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {item.prazo}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {item.vencimento}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 font-semibold">
                    {formatarMoeda(item.valor)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 font-semibold">
                    {formatarMoeda(item.juros)}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {/* Exportar */}
                      <button
                        onClick={() => exportarCSV(item)}
                        title="Exportar"
                        className="text-gray-500 hover:text-orange-500 transition"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => abrirEdicao(item)}
                        title="Editar"
                        className="text-gray-500 hover:text-blue-500 transition"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => excluir(item.id)}
                        title="Excluir"
                        className="text-gray-500 hover:text-red-500 transition"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>

                      {/* Download */}
                      <button
                        onClick={() => exportarCSV(item)}
                        title="Download"
                        className="text-gray-500 hover:text-green-500 transition"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé com contagem */}
      <div className="mt-3 text-xs text-gray-400">
        {dadosFiltrados.length} registro(s) exibido(s)
        {selecionados.length > 0 && (
          <span className="ml-3 text-orange-500 font-semibold">
            {selecionados.length} selecionado(s)
          </span>
        )}
      </div>

      {/* ===== MODAL DE EDIÇÃO ===== */}
      {modalAberto && itemEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-700 mb-5 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Editar Registro
            </h2>

            <div className="space-y-3">
              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </label>
                <select
                  value={itemEditando.status}
                  onChange={(e) =>
                    setItemEditando({ ...itemEditando, status: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="pago">Pago</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Cliente
                </label>
                <input
                  type="text"
                  value={itemEditando.cliente}
                  onChange={(e) =>
                    setItemEditando({
                      ...itemEditando,
                      cliente: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* NF-e */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  NF-e
                </label>
                <input
                  type="text"
                  value={itemEditando.nfe}
                  onChange={(e) =>
                    setItemEditando({ ...itemEditando, nfe: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Prazo */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Prazo
                </label>
                <input
                  type="text"
                  value={itemEditando.prazo}
                  onChange={(e) =>
                    setItemEditando({ ...itemEditando, prazo: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Vencimento */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Data de Vencimento
                </label>
                <input
                  type="text"
                  value={itemEditando.vencimento}
                  onChange={(e) =>
                    setItemEditando({
                      ...itemEditando,
                      vencimento: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Valor e Juros lado a lado */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemEditando.valor}
                    onChange={(e) =>
                      setItemEditando({
                        ...itemEditando,
                        valor: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Juros (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemEditando.juros}
                    onChange={(e) =>
                      setItemEditando({
                        ...itemEditando,
                        juros: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>

            {/* Botões do modal */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-sm font-bold transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}