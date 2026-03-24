import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../api";
import { getDefaultAppRoute, getStoredToken, persistSession } from "../auth";
import { LogoMain, AuthSideImg } from "../assets/assets-map";
import DesktopWindowControls from "../components/DesktopWindowControls";

const initialForm = { nome: "", email: "", senha: "" };

export default function AuthPage() {
  const navigate = useNavigate();
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      navigate("/app/dashboard", { replace: true });
      return;
    }

    let active = true;
    api
      .get("/auth/bootstrap-status")
      .then((res) => {
        if (!active) return;
        setBootstrapRequired(Boolean(res.data?.bootstrap_required));
      })
      .catch(() => {
        if (!active) return;
        toast.error("Nao foi possivel verificar o status inicial do sistema.");
      })
      .finally(() => {
        if (active) setLoadingBootstrap(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const finalizarLogin = (payload) => {
    persistSession(payload.token, payload.user);
    toast.success("Acesso liberado com sucesso!");
    navigate(getDefaultAppRoute(payload.user), { replace: true });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post("/auth/login", {
        email: form.email,
        senha: form.senha,
      });
      finalizarLogin(response.data);
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao processar o login.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBootstrap = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/usuarios", form);
      const response = await api.post("/auth/login", {
        email: form.email,
        senha: form.senha,
      });
      toast.success("Administrador inicial criado com sucesso!");
      finalizarLogin(response.data);
    } catch (error) {
      toast.error(error.response?.data?.erro || "Nao foi possivel concluir a configuracao inicial.");
    } finally {
      setSubmitting(false);
    }
  };

  const isBootstrap = bootstrapRequired;

  return (
    <div className="relative min-h-screen w-full flex bg-gradient-to-b from-[#E68216] from-0% via-white/0 via-60% to-white/0 to-100%">
      <DesktopWindowControls className="absolute right-4 top-4 z-20" />

      <div className="hidden lg:flex flex-1 items-center justify-center bg-white relative overflow-hidden">
        <img src={AuthSideImg} alt="Ilustracao" className="max-w-[520px] drop-shadow-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent" />
      </div>

      <div className="w-full lg:w-[32%] flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[440px]">
          <div className="flex justify-center mb-10">
            <img src={LogoMain} alt="AMP Usinagem" className="h-16" />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              {loadingBootstrap ? "Carregando acesso" : isBootstrap ? "Configuracao inicial" : "Acesso ao sistema"}
            </h1>
            <p className="text-gray-600 mt-3 text-lg">
              {loadingBootstrap
                ? "Estamos preparando o ambiente do sistema."
                : isBootstrap
                  ? "Crie o primeiro usuario administrador para iniciar a operacao."
                  : "Entre com um usuario ja liberado pela administracao."}
            </p>
          </div>

          {loadingBootstrap ? (
            <div className="rounded-3xl bg-white border border-gray-200 p-10 shadow-sm flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
          ) : (
            <form onSubmit={isBootstrap ? handleBootstrap : handleLogin} className="space-y-6">
              {isBootstrap && (
                <div>
                  <input
                    type="text"
                    placeholder="Nome do administrador"
                    value={form.nome}
                    onChange={updateField("nome")}
                    required
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
                  />
                </div>
              )}

              <div>
                <input
                  type="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={updateField("email")}
                  required
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder={isBootstrap ? "Crie uma senha" : "Senha"}
                  value={form.senha}
                  onChange={updateField("senha")}
                  required
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-4 rounded-2xl text-xl transition-all active:scale-[0.985] shadow-lg shadow-blue-500/30"
              >
                {submitting ? "Processando..." : isBootstrap ? "Criar Administrador" : "Entrar no Sistema"}
              </button>
            </form>
          )}

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 leading-6">
            {isBootstrap
              ? "O primeiro usuario criado recebe acesso total como administrador. Depois disso, novos usuarios so podem ser criados pela tela de administracao interna."
              : "O cadastro publico foi desabilitado. Novos usuarios devem ser criados e liberados por um administrador do sistema."}
          </div>
        </div>
      </div>
    </div>
  );
}
