import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import api from "../api";
import { getStoredUser } from "../auth";

const emptyForm = {
  nome: "",
  email: "",
  senha: "",
  perfil: "comercial",
  ativo: true,
};

export default function Usuarios() {
  const currentUser = getStoredUser();
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const title = useMemo(
    () => (editingId ? "Editar usuário" : "Novo usuário"),
    [editingId]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [usuariosRes, perfisRes] = await Promise.all([
        api.get("/auth/usuarios"),
        api.get("/auth/perfis"),
      ]);
      setUsuarios(usuariosRes.data || []);
      setPerfis(perfisRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.erro || "Nao foi possivel carregar os usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateField = (field) => (event) => {
    const value = field === "ativo" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (usuario) => {
    setEditingId(usuario.id);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfil: usuario.perfil,
      ativo: usuario.ativo,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/auth/usuarios/${editingId}`, form);
        toast.success("Usuario atualizado com sucesso!");
      } else {
        await api.post("/auth/usuarios", form);
        toast.success("Usuario criado com sucesso!");
      }
      resetForm();
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.erro || "Nao foi possivel salvar o usuario.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usuários e Permissões</h1>
            <p className="text-gray-600 mt-2 max-w-3xl">
              O primeiro usuário do sistema é administrador. Depois disso, apenas administradores podem criar contas,
              definir perfil de acesso e ativar ou desativar usuários secundários.
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
            Administrador atual: <strong>{currentUser?.nome || "Administrador"}</strong>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[420px,minmax(0,1fr)] gap-6">
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-700">Nome</span>
              <input
                type="text"
                value={form.nome}
                onChange={updateField("nome")}
                required
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-700">E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={updateField("email")}
                required
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-700">Senha {editingId && <span className="text-gray-400">(deixe em branco para manter)</span>}</span>
              <input
                type="password"
                value={form.senha}
                onChange={updateField("senha")}
                placeholder={editingId ? "Manter senha atual" : "Defina a senha de acesso"}
                required={!editingId}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-700">Perfil</span>
              <select
                value={form.perfil}
                onChange={updateField("perfil")}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
              >
                {perfis.map((perfil) => (
                  <option key={perfil.id} value={perfil.id}>
                    {perfil.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 bg-gray-50">
              <input type="checkbox" checked={form.ativo} onChange={updateField("ativo")} className="h-4 w-4" />
              <span className="text-sm text-gray-700">Usuário ativo para login</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-blue-600 text-white font-semibold py-3.5 hover:bg-blue-700 disabled:opacity-70 transition"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar usuário"}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Equipe cadastrada</h2>
              <p className="text-sm text-gray-500 mt-1">Gerencie quem acessa cada parte do sistema.</p>
            </div>
            <div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-700">
              {usuarios.length} usuário{usuarios.length === 1 ? "" : "s"}
            </div>
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usuarios.map((usuario) => (
                <article key={usuario.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{usuario.nome}</h3>
                      <p className="text-sm text-gray-500 truncate">{usuario.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${usuario.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {usuario.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold">
                      {usuario.perfil_label || usuario.perfil}
                    </span>
                    {(usuario.permissoes || []).map((permissao) => (
                      <span key={permissao} className="rounded-full bg-white border border-gray-200 text-gray-600 px-3 py-1 text-xs">
                        {permissao.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEdit(usuario)}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700 transition"
                  >
                    Editar usuário
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
