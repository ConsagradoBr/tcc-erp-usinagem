import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtD = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR") : "—";

function useNotif() {
  const [notif, setNotif] = useState(null);
  const show = (msg, tipo = "sucesso") => {
    setNotif({ msg, tipo });
    setTimeout(() => setNotif(null), 3000);
  };
  return [notif, show];
}

// ─── Badges ───────────────────────────────────────────────────────────────────
const BADGE = {
  pago:      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700",
  pendente:  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700",
  atrasado:  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700",
};
const LABEL_STATUS = { pago: "Pago", pendente: "Pendente", atrasado: "Atrasado" };
const LABEL_TIPO   = { receber: "A Receber", pagar: "A Pagar" };

const FORMAS = ["PIX", "Boleto", "Transferência", "Dinheiro", "Cartão", "Cheque"];
const PRAZOS = [1, 5, 7, 15, 30, 45, 60, 90];

// ─── Form vazio ───────────────────────────────────────────────────────────────
const FORM_VAZIO = {
  tipo: "receber", cliente_id: "", descricao: "", nfe: "",
  prazo_dias: "", vencimento: "", valor: "", forma_pagamento: "", observacao: "",
};

// ─── Modal Importar Boleto PDF ────────────────────────────────────────────────
function ModalBoleto({ clientes, onClose, onSalvo }) {
  const [etapa, setEtapa]         = useState("upload");   // upload | revisao
  const [tipo, setTipo]           = useState("pagar");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]           = useState(null);
  const [dadosParsed, setDadosParsed] = useState(null);
  const [form, setForm]           = useState(null);
  const [salvando, setSalvando]   = useState(false);
  const inputRef                  = useRef(null);

  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    inputRef.current.value = "";
    if (!arquivo) return;
    if (!arquivo.name.endsWith(".pdf")) { setErro("Apenas arquivos .pdf são aceitos."); return; }

    setCarregando(true);
    setErro(null);
    try {
      // Converter para base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Falha ao ler arquivo"));
        r.readAsDataURL(arquivo);
      });

      const resp = await api.post("/financeiro/boleto", { pdf_base64: base64, tipo });
      const d    = resp.data;
      setDadosParsed(d);
      setForm({
        tipo:            tipo,
        cliente_id:      "",
        descricao:       d.descricao || "Boleto bancário",
        nfe:             d.nfe || "",
        prazo_dias:      "",
        vencimento:      d.vencimento || "",
        valor:           d.valor || "",
        forma_pagamento: "Boleto",
        observacao:      d.beneficiario ? `Beneficiário: ${d.beneficiario}` : "",
      });
      setEtapa("revisao");
    } catch (err) {
      setErro(err.response?.data?.erro || "Erro ao processar o boleto.");
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/financeiro", { ...form, cliente_id: form.cliente_id || null, prazo_dias: form.prazo_dias || null });
      onSalvo();
      onClose();
    } catch (err) {
      setErro(err.response?.data?.erro || "Erro ao salvar.");
      setSalvando(false);
    }
  };

  const inp = "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
  const lbl = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <h2 className="text-lg font-bold text-gray-700">Importar Boleto PDF</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6">
          {erro && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}

          {/* Etapa 1: Upload */}
          {etapa === "upload" && (
            <div className="space-y-4">
              {/* Tipo */}
              <div>
                <label className={lbl}>Este boleto é para:</label>
                <div className="mt-1 flex gap-2">
                  {[["pagar","↑ Pagar"],["receber","↓ Receber"]].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setTipo(v)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${tipo === v ? (v === "receber" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500") : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleArquivo} />
              <button onClick={() => inputRef.current?.click()} disabled={carregando}
                className="w-full border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-xl p-8 text-center transition group">
                {carregando ? (
                  <div className="text-orange-500 text-sm font-semibold animate-pulse">Lendo boleto...</div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-300 group-hover:text-orange-400 mx-auto mb-2 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                    <p className="text-sm font-semibold text-gray-600 group-hover:text-orange-500 transition">Clique para selecionar o boleto</p>
                    <p className="text-xs text-gray-400 mt-1">Apenas arquivos .pdf</p>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Etapa 2: Revisão */}
          {etapa === "revisao" && form && (
            <>
              <div className="mb-4 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-medium">
                ✓ Dados extraídos do boleto — revise e confirme
              </div>
              <form onSubmit={handleSalvar} className="space-y-3">
                {/* Tipo */}
                <div>
                  <label className={lbl}>Tipo</label>
                  <div className="mt-1 flex gap-2">
                    {[["pagar","↑ A Pagar"],["receber","↓ A Receber"]].map(([v,l]) => (
                      <button key={v} type="button" onClick={() => set("tipo", v)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${form.tipo === v ? (v === "receber" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500") : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={lbl}>Cliente</label>
                  <select value={form.cliente_id} onChange={(e) => set("cliente_id", e.target.value)} className={inp}>
                    <option value="">— Sem vínculo —</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className={lbl}>Descrição *</label>
                  <input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} required className={inp} />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={lbl}>Vencimento *</label>
                    <input type="date" value={form.vencimento} onChange={(e) => set("vencimento", e.target.value)} required className={inp} />
                  </div>
                  <div className="flex-1">
                    <label className={lbl}>Valor (R$) *</label>
                    <input type="number" step="0.01" min="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} required className={inp} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={lbl}>NF-e</label>
                    <input value={form.nfe} onChange={(e) => set("nfe", e.target.value)} className={inp} />
                  </div>
                  <div className="flex-1">
                    <label className={lbl}>Forma de Pagamento</label>
                    <select value={form.forma_pagamento} onChange={(e) => set("forma_pagamento", e.target.value)} className={inp}>
                      {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={lbl}>Observação</label>
                  <textarea value={form.observacao} onChange={(e) => set("observacao", e.target.value)} rows={2} className={inp + " resize-none"} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEtapa("upload")} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-100 transition">← Voltar</button>
                  <button type="submit" disabled={salvando} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg py-2 text-sm font-bold transition">
                    {salvando ? "Salvando..." : "Cadastrar Lançamento"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Lançamento (criar / editar) ────────────────────────────────────────
function ModalLancamento({ item, clientes, onClose, onSalvo }) {
  const editando = !!item?.id;
  const [form, setForm]         = useState(editando ? {
    tipo:            item.tipo,
    cliente_id:      String(item.cliente_id || ""),
    descricao:       item.descricao,
    nfe:             item.nfe || "",
    prazo_dias:      item.prazo_dias || "",
    vencimento:      item.vencimento,
    valor:           item.valor,
    forma_pagamento: item.forma_pagamento || "",
    observacao:      item.observacao || "",
  } : { ...FORM_VAZIO });
  const [parcelas, setParcelas] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [notif, show]           = useNotif();

  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handlePrazo = (dias) => {
    set("prazo_dias", dias);
    if (dias) {
      const d = new Date();
      d.setDate(d.getDate() + Number(dias));
      set("vencimento", d.toISOString().split("T")[0]);
    }
  };

  // Preview das parcelas
  const previewParcelas = () => {
    if (!form.vencimento || !form.valor || parcelas <= 1) return null;
    const valorParcela = (Number(form.valor) / parcelas).toFixed(2);
    const base = new Date(form.vencimento + "T12:00:00");
    const prazo = Number(form.prazo_dias) || 30;
    return Array.from({ length: parcelas }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + prazo * i);
      return { num: i + 1, venc: d.toLocaleDateString("pt-BR"), valor: valorParcela };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descricao.trim()) { show("Descrição obrigatória.", "erro"); return; }
    if (!form.vencimento)       { show("Vencimento obrigatório.", "erro"); return; }
    if (!form.valor || Number(form.valor) <= 0) { show("Valor deve ser maior que zero.", "erro"); return; }

    setSalvando(true);
    try {
      const base = { ...form, cliente_id: form.cliente_id ? Number(form.cliente_id) : null, prazo_dias: form.prazo_dias || null };

      if (editando) {
        await api.put(`/financeiro/${item.id}`, base);
      } else {
        // Backend gera N parcelas de uma vez
        await api.post("/financeiro", { ...base, parcelas });
      }
      onSalvo();
      onClose();
    } catch (err) {
      show(err.response?.data?.erro || "Erro ao salvar.", "erro");
    } finally {
      setSalvando(false);
    }
  };

  const inp = "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
  const lbl = "text-xs font-semibold text-gray-500 uppercase tracking-wide";
  const preview = previewParcelas();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            <h2 className="text-lg font-bold text-gray-700">{editando ? "Editar Lançamento" : "Novo Lançamento"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {notif && (
          <div className={`mx-6 mt-3 px-3 py-2 rounded-lg text-xs font-semibold text-white ${notif.tipo === "erro" ? "bg-red-500" : "bg-green-500"}`}>{notif.msg}</div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className={lbl}>Tipo</label>
            <div className="mt-1 flex gap-2">
              {["receber","pagar"].map((t) => (
                <button key={t} type="button" onClick={() => set("tipo", t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${form.tipo === t ? (t === "receber" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500") : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                  {t === "receber" ? "↓ A Receber" : "↑ A Pagar"}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente — valor como string para o select */}
          <div>
            <label className={lbl}>Cliente</label>
            <select value={form.cliente_id} onChange={(e) => set("cliente_id", e.target.value)} className={inp}>
              <option value="">— Sem vínculo —</option>
              {clientes.map((c) => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className={lbl}>Descrição <span className="text-red-500">*</span></label>
            <input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Serviço de torneamento CNC - OS #42" required className={inp} />
          </div>

          {/* NF-e */}
          <div>
            <label className={lbl}>NF-e</label>
            <input value={form.nfe} onChange={(e) => set("nfe", e.target.value)} placeholder="Número da nota fiscal" className={inp} />
          </div>

          {/* Prazo + Vencimento */}
          <div className="flex gap-3">
            <div className="w-40">
              <label className={lbl}>Prazo (dias)</label>
              <select value={form.prazo_dias} onChange={(e) => handlePrazo(e.target.value)} className={inp}>
                <option value="">Escolher</option>
                {PRAZOS.map((p) => <option key={p} value={p}>{p} dias</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={lbl}>1º Vencimento <span className="text-red-500">*</span></label>
              <input type="date" value={form.vencimento} onChange={(e) => set("vencimento", e.target.value)} required className={inp} />
            </div>
          </div>

          {/* Valor + Parcelas */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={lbl}>Valor Total (R$) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" required className={inp} />
            </div>
            {!editando && (
              <div className="w-32">
                <label className={lbl}>Parcelas</label>
                <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className={inp}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n === 1 ? "À vista" : `${n}x`}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Preview parcelas */}
          {preview && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">
                Preview — {parcelas}x de {fmt(Number(form.valor) / parcelas)}
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {preview.map(p => (
                  <div key={p.num} className="flex justify-between text-xs text-gray-600">
                    <span className="font-medium">Parcela {p.num}/{parcelas}</span>
                    <span>{p.venc}</span>
                    <span className="font-semibold">{fmt(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forma de pagamento */}
          <div>
            <label className={lbl}>Forma de Pagamento</label>
            <select value={form.forma_pagamento} onChange={(e) => set("forma_pagamento", e.target.value)} className={inp}>
              <option value="">— Não definida —</option>
              {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Observação */}
          <div>
            <label className={lbl}>Observação</label>
            <textarea value={form.observacao} onChange={(e) => set("observacao", e.target.value)} rows={2} placeholder="Anotações adicionais..." className={inp + " resize-none"} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-100 transition">Cancelar</button>
            <button type="submit" disabled={salvando} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg py-2 text-sm font-bold transition">
              {salvando ? "Salvando..." : editando ? "Salvar" : parcelas > 1 ? `Criar ${parcelas} parcelas` : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Marcar Pago ────────────────────────────────────────────────────────
function ModalPagar({ item, onClose, onSalvo }) {
  const [dataPag, setDataPag]   = useState(new Date().toISOString().split("T")[0]);
  const [forma, setForma]       = useState(item.forma_pagamento || "");
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    setSalvando(true);
    try {
      await api.patch(`/financeiro/${item.id}/pagar`, { data_pagamento: dataPag, forma_pagamento: forma || null });
      onSalvo();
      onClose();
    } catch {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-700 mb-1">Confirmar Pagamento</h3>
        <p className="text-sm text-gray-500 mb-4">{item.descricao}</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data do Pagamento</label>
            <input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Forma de Pagamento</label>
            <select value={forma} onChange={(e) => setForma(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">— Não informada —</option>
              {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Valor:</span><span className="font-semibold">{fmt(item.valor)}</span></div>
            {item.juros > 0 && <div className="flex justify-between text-red-600"><span>Juros:</span><span>+ {fmt(item.juros)}</span></div>}
            <div className="flex justify-between font-bold border-t border-gray-200 mt-1 pt-1"><span>Total:</span><span>{fmt(item.valor_total)}</span></div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-100 transition">Cancelar</button>
          <button onClick={confirmar} disabled={salvando} className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg py-2 text-sm font-bold transition">
            {salvando ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Confirmação Exclusão ───────────────────────────────────────────────
function ModalConfirmar({ item, onClose, onConfirmar }) {
  const [excluindo, setExcluindo] = useState(false);
  const temGrupo = item.parcelas > 1;

  const handleExcluir = async (modo) => {
    setExcluindo(true);
    await onConfirmar(modo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <h3 className="font-bold text-gray-800 mb-1">Excluir lançamento?</h3>
        <p className="text-gray-500 text-sm mb-1">{item.descricao}</p>

        {temGrupo && (
          <p className="text-xs text-orange-500 font-medium mb-4">
            Este lançamento possui {item.parcelas} parcelas no total.
          </p>
        )}

        {!temGrupo ? (
          <div className="flex gap-3 mt-4">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-100 transition">Cancelar</button>
            <button onClick={() => handleExcluir("unico")} disabled={excluindo}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg py-2 text-sm font-bold transition">
              {excluindo ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            <button onClick={() => handleExcluir("grupo")} disabled={excluindo}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg py-2.5 text-sm font-bold transition">
              {excluindo ? "Excluindo..." : `Excluir todas as ${item.parcelas} parcelas`}
            </button>
            <button onClick={() => handleExcluir("unico")} disabled={excluindo}
              className="w-full border border-red-300 text-red-500 hover:bg-red-50 rounded-lg py-2.5 text-sm font-semibold transition">
              Excluir só esta parcela ({item.parcela_num}/{item.parcelas})
            </button>
            <button onClick={onClose} className="w-full border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg py-2 text-sm transition">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Financeiro() {
  const [dados, setDados]           = useState([]);
  const [clientes, setClientes]     = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro]         = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [notif, show]               = useNotif();

  // Modais
  const [modalForm, setModalForm]       = useState(false);
  const [itemEdit, setItemEdit]         = useState(null);
  const [itemPagar, setItemPagar]       = useState(null);
  const [itemDel, setItemDel]           = useState(null);
  const [modalBoleto, setModalBoleto]   = useState(false);
  const [expandido, setExpandido]     = useState(null);   // id do lançamento pai expandido

  // ── Carregar ────────────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (filtroTipo)   params.tipo   = filtroTipo;
      if (filtroStatus) params.status = filtroStatus;
      if (filtro)       params.q      = filtro;
      const [res, resC] = await Promise.all([
        api.get("/financeiro", { params }),
        api.get("/clientes"),
      ]);
      setDados(res.data);
      setClientes(resC.data);
    } catch {
      show("Erro ao carregar dados.", "erro");
    } finally {
      setCarregando(false);
    }
  }, [filtro, filtroTipo, filtroStatus]);

  useEffect(() => {
    const t = setTimeout(() => carregar(), 300);
    return () => clearTimeout(t);
  }, [carregar]);

  // ── Totais da listagem atual ─────────────────────────────────────────────────
  const totalReceber = dados.filter(d => d.tipo === "receber" && d.status !== "pago").reduce((s, d) => s + d.valor_total, 0);
  const totalPagar   = dados.filter(d => d.tipo === "pagar"   && d.status !== "pago").reduce((s, d) => s + d.valor_total, 0);
  const totalJuros   = dados.reduce((s, d) => s + d.juros, 0);

  // ── Seleção ──────────────────────────────────────────────────────────────────
  const toggleSel = (id) => setSelecionados((p) => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  const toggleTodos = () => setSelecionados(selecionados.length === dados.length ? [] : dados.map(d => d.id));

  // ── Excluir ──────────────────────────────────────────────────────────────────
  const excluir = async (modo = "unico") => {
    try {
      await api.delete(`/financeiro/${itemDel.id}?modo=${modo}`);
      show(modo === "grupo" ? "Todas as parcelas excluídas." : "Lançamento excluído.");
      setItemDel(null);
      carregar();
    } catch {
      show("Erro ao excluir.", "erro");
    }
  };

  // ── Exportar CSV ─────────────────────────────────────────────────────────────
  const exportarCSV = (item) => {
    const cab  = "Tipo,Status,Cliente,Descrição,NF-e,Vencimento,Valor,Juros,Total,Forma Pagamento\n";
    const lin  = `${item.tipo},${item.status},${item.cliente_nome||""},${item.descricao},${item.nfe||""},${item.vencimento},${item.valor},${item.juros},${item.valor_total},${item.forma_pagamento||""}\n`;
    const blob = new Blob([cab + lin], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `lancamento_${item.id}.csv`; a.click();
    URL.revokeObjectURL(url);
    show("CSV exportado!");
  };

  const abrirNovo   = ()  => { setItemEdit(null); setModalForm(true); };
  const abrirEdicao = (i) => { setItemEdit(i);    setModalForm(true); };

  return (
    <div className="flex-1 bg-gray-50 min-h-screen p-6">

      {/* Notificação */}
      {notif && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-semibold transition-all ${notif.tipo === "erro" ? "bg-red-500" : "bg-green-500"}`}>
          {notif.msg}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h1 className="text-xl font-bold tracking-widest text-gray-700 uppercase">Financeiro</h1>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">A Receber</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalReceber)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">A Pagar</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{fmt(totalPagar)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Juros em aberto</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{fmt(totalJuros)}</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-600 uppercase tracking-wide">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
          Filter
        </div>

        <input type="text" value={filtro} onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por cliente, descrição ou NF-e..."
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-400" />

        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">Todos os tipos</option>
          <option value="receber">A Receber</option>
          <option value="pagar">A Pagar</option>
        </select>

        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
          <option value="pago">Pago</option>
        </select>

        <button onClick={abrirNovo}
          className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded transition ml-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Novo Lançamento
        </button>

        <button onClick={() => setModalBoleto(true)}
          className="flex items-center gap-1 bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold uppercase px-3 py-1.5 rounded transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Importar Boleto
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg overflow-hidden shadow border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-orange-500 text-white text-xs uppercase tracking-wider">
              <th className="px-3 py-3 text-left w-8">
                <input type="checkbox" checked={selecionados.length === dados.length && dados.length > 0} onChange={toggleTodos} className="accent-white cursor-pointer" />
              </th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Tipo</th>
              <th className="px-4 py-3 text-left">Cliente / Descrição</th>
              <th className="px-4 py-3 text-center">NF-e</th>
              <th className="px-4 py-3 text-center">Vencimento</th>
              <th className="px-4 py-3 text-center">Valor</th>
              <th className="px-4 py-3 text-center">Juros</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400 bg-white">Carregando...</td></tr>
            ) : dados.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400 bg-white">Nenhum lançamento encontrado.</td></tr>
            ) : (
              dados.map((item, idx) => {
                // Agrupar parcelas: só mostra a 1ª linha de cada grupo
                // As demais (parcela_num > 1) ficam na expansão
                if (item.parcelas > 1 && item.parcela_num > 1) return null;

                const temParcelas = item.parcelas > 1;
                const aberto      = expandido === item.id;

                // Busca irmãs (parcelas 2..N) pelo padrão de descrição
                const irmas = temParcelas
                  ? dados.filter(d => d.id !== item.id && d.parcelas === item.parcelas && d.descricao.startsWith(item.descricao.replace(/ \(1\/\d+\)$/, "")))
                  : [];

                return (
                  <>
                    <tr key={item.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-orange-50 transition`}>
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selecionados.includes(item.id)} onChange={() => toggleSel(item.id)} className="accent-orange-500 cursor-pointer" />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={BADGE[item.status]}>{LABEL_STATUS[item.status]}</span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold ${item.tipo === "receber" ? "text-green-600" : "text-red-500"}`}>
                          {item.tipo === "receber" ? "↓ Receber" : "↑ Pagar"}
                        </span>
                      </td>

                      {/* Cliente / Descrição + badge parcelas */}
                      <td className="px-4 py-3">
                        {item.cliente_nome && <p className="font-semibold text-gray-700 text-xs">{item.cliente_nome}</p>}
                        <div className="flex items-center gap-2">
                          <p className={`text-gray-600 ${item.cliente_nome ? "text-xs text-gray-400" : "font-medium"}`}>{item.descricao}</p>
                          {temParcelas && (
                            <button onClick={() => setExpandido(aberto ? null : item.id)}
                              className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-600 hover:bg-orange-200 transition">
                              {item.parcelas}x {aberto ? "▲" : "▼"}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-gray-500">{item.nfe || "—"}</td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        <span className={item.status === "atrasado" ? "text-red-600 font-semibold" : ""}>{fmtD(item.vencimento)}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 font-semibold">{fmt(item.valor)}</td>
                      <td className="px-4 py-3 text-center">
                        {item.juros > 0
                          ? <span className="text-red-500 font-semibold">+ {fmt(item.juros)}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800">{fmt(item.valor_total)}</td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {item.status !== "pago" && (
                            <button onClick={() => setItemPagar(item)} title="Marcar como pago" className="text-gray-500 hover:text-green-500 transition">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </button>
                          )}
                          <button onClick={() => exportarCSV(item)} title="Exportar CSV" className="text-gray-500 hover:text-orange-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                          </button>
                          <button onClick={() => abrirEdicao(item)} title="Editar" className="text-gray-500 hover:text-blue-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                          </button>
                          <button onClick={() => setItemDel(item)} title="Excluir" className="text-gray-500 hover:text-red-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Linha expansível com as parcelas */}
                    {temParcelas && aberto && (
                      <tr key={`exp-${item.id}`} className="bg-orange-50 border-t border-orange-100">
                        <td colSpan={10} className="px-6 py-3">
                          <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">Parcelas</p>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 uppercase tracking-wide border-b border-orange-200">
                                <th className="py-1 text-left font-semibold">Parcela</th>
                                <th className="py-1 text-center font-semibold">Status</th>
                                <th className="py-1 text-center font-semibold">Vencimento</th>
                                <th className="py-1 text-center font-semibold">Valor</th>
                                <th className="py-1 text-center font-semibold">Juros</th>
                                <th className="py-1 text-center font-semibold">Total</th>
                                <th className="py-1 text-center font-semibold">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[item, ...irmas].sort((a,b) => a.parcela_num - b.parcela_num).map(p => (
                                <tr key={p.id} className="border-b border-orange-100 hover:bg-orange-100 transition">
                                  <td className="py-1.5 font-medium text-gray-700">{p.parcela_num}/{p.parcelas}</td>
                                  <td className="py-1.5 text-center"><span className={BADGE[p.status]}>{LABEL_STATUS[p.status]}</span></td>
                                  <td className="py-1.5 text-center text-gray-600">{fmtD(p.vencimento)}</td>
                                  <td className="py-1.5 text-center text-gray-700 font-semibold">{fmt(p.valor)}</td>
                                  <td className="py-1.5 text-center text-red-500">{p.juros > 0 ? `+ ${fmt(p.juros)}` : "—"}</td>
                                  <td className="py-1.5 text-center font-bold text-gray-800">{fmt(p.valor_total)}</td>
                                  <td className="py-1.5 text-center">
                                    {p.status !== "pago" && (
                                      <button onClick={() => setItemPagar(p)} title="Marcar pago" className="text-gray-400 hover:text-green-500 transition mr-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                      </button>
                                    )}
                                    <button onClick={() => setItemDel(p)} title="Excluir parcela" className="text-gray-400 hover:text-red-500 transition">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="mt-3 text-xs text-gray-400">
        {dados.length} registro(s) exibido(s)
        {selecionados.length > 0 && <span className="ml-3 text-orange-500 font-semibold">{selecionados.length} selecionado(s)</span>}
      </div>

      {/* Modais */}
      {modalBoleto && (
        <ModalBoleto clientes={clientes} onClose={() => setModalBoleto(false)} onSalvo={() => { show("Boleto cadastrado!"); carregar(); }} />
      )}
      {modalForm && (
        <ModalLancamento item={itemEdit} clientes={clientes} onClose={() => { setModalForm(false); setItemEdit(null); }} onSalvo={() => { show(itemEdit ? "Lançamento atualizado!" : "Lançamento criado!"); carregar(); }} />
      )}
      {itemPagar && (
        <ModalPagar item={itemPagar} onClose={() => setItemPagar(null)} onSalvo={() => { show("Pagamento registrado!"); carregar(); }} />
      )}
      {itemDel && (
        <ModalConfirmar item={itemDel} onClose={() => setItemDel(null)} onConfirmar={excluir} />
      )}
    </div>
  );
}