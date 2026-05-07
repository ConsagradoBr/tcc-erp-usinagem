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

function AccessModal({
  currentUser,
  editingId,
  perfis,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  const title = editingId ? "Editar usuário" : "Novo usuário";
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="amp-terminal-modal-shell">
      <div className="amp-terminal-modal-card surface-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Formulário de acesso</p>
            <h3>{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="pill">
            Fechar
          </button>
        </div>

        <form onSubmit={onSubmit} className="amp-terminal-form-grid">
          <label className="amp-terminal-field">
            <span>Nome</span>
            <input type="text" value={form.nome} onChange={onChange("nome")} required />
          </label>

          <label className="amp-terminal-field">
            <span>E-mail</span>
            <input type="email" value={form.email} onChange={onChange("email")} required />
          </label>

          <label className="amp-terminal-field">
            <span>Senha {editingId ? "(deixe em branco para manter)" : ""}</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.senha}
                onChange={onChange("senha")}
                placeholder={editingId ? "Manter senha atual" : "Defina a senha de acesso"}
                required={!editingId}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--amp-orange)] hover:text-[var(--amp-text)]"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          <label className="amp-terminal-field">
            <span>Perfil</span>
            <select value={form.perfil} onChange={onChange("perfil")}>
              {perfis.map((perfil) => (
                <option key={perfil.id} value={perfil.id}>
                  {perfil.label}
                </option>
              ))}
            </select>
          </label>

          <label className="amp-terminal-check">
            <input type="checkbox" checked={form.ativo} onChange={onChange("ativo")} />
            <span>Usuário ativo para login</span>
          </label>

          <div className="amp-terminal-modal-actions">
            <button type="button" onClick={onClose} className="pill">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="status-tag is-cool amp-terminal-submit-btn">
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar usuário"}
            </button>
          </div>
        </form>

        <div className="balance-stack">
          <div className="balance-card">
            <span>Admin atual</span>
            <strong>{currentUser?.nome || "Administrador"}</strong>
          </div>
          <div className="balance-card">
            <span>Criação</span>
            <strong>{editingId ? "Edição guiada" : "Novo acesso"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const currentUser = getStoredUser();
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const usuariosAtivos = useMemo(() => usuarios.filter((usuario) => usuario.ativo).length, [usuarios]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usuariosRes, perfisRes] = await Promise.all([api.get("/auth/usuarios"), api.get("/auth/perfis")]);
      setUsuarios(usuariosRes.data || []);
      setPerfis(perfisRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.erro || "Não foi possível carregar os usuários.");
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

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (usuario) => {
    setEditingId(usuario.id);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfil: usuario.perfil,
      ativo: usuario.ativo,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/auth/usuarios/${editingId}`, form);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        await api.post("/auth/usuarios", form);
        toast.success("Usuário criado com sucesso!");
      }
      closeModal();
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.erro || "Não foi possível salvar o usuário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden amp-bg px-3 py-2" style={{ borderRadius: "12px" }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
      <div className="screen-grid screen-grid-admin">
        <section className="surface-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Administração</p>
              <h3>Usuários e papéis internos</h3>
            </div>
            <button type="button" onClick={openNew} className="pill is-solid">
              Novo usuário
            </button>
          </div>

          {loading ? (
            <div className="amp-shell-loading min-h-[240px]">
              <div className="amp-shell-loader" />
              <p>Sincronizando usuários...</p>
            </div>
          ) : (
            <div className="table-shell slim">
              <div className="table-head table-grid-users">
                <span>Usuário</span>
                <span>Papel</span>
                <span>Status</span>
                <span>Acesso</span>
              </div>
              <div className="table-body">
                {usuarios.map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => openEdit(usuario)}
                    className="table-row table-grid-users is-clickable"
                  >
                    <span>{usuario.nome}</span>
                    <span>{usuario.perfil_label || usuario.perfil}</span>
                    <span>
                      <span className={`status-tag ${usuario.ativo ? "is-cool" : ""}`}>
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </span>
                    <span>{usuario.permissoes?.length ? "Liberado" : "Restrito"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="inspector-panel">
          <p className="eyebrow">Mensagem oficial</p>
          <h3>Acesso controlado</h3>
          <p className="muted">
            O sistema não trabalha com cadastro público. Usuários são criados e liberados pela administração.
          </p>

          <div className="balance-stack">
            <div className="balance-card">
              <span>Admin atual</span>
              <strong>{currentUser?.nome || "Administrador"}</strong>
            </div>
            <div className="balance-card">
              <span>Usuários ativos</span>
              <strong>{usuariosAtivos}</strong>
            </div>
            <div className="balance-card">
              <span>Papéis disponíveis</span>
              <strong>{perfis.length}</strong>
            </div>
          </div>
        </aside>
      </div>

      {modalOpen && (
        <AccessModal
          currentUser={currentUser}
          editingId={editingId}
          perfis={perfis}
          form={form}
          saving={saving}
          onChange={updateField}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
      </div>
    </div>
  );
}
