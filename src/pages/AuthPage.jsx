import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../api";
import { getDefaultAppRoute, getStoredToken, persistSession } from "../auth";
import LoginLogoMotion from "../../docs/design/amp-v2-local/amp-login-motion.svg";

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
  const heading = loadingBootstrap
    ? "Carregando acesso"
    : isBootstrap
      ? "Configuracao inicial"
      : "Acesse o sistema";
  const description = loadingBootstrap
    ? "Estamos preparando o ambiente do sistema."
    : isBootstrap
      ? "Crie o primeiro administrador."
      : "Use sua conta AMP.";

  return (
    <div className="login-shell amp-ui-scale">
      <section className="login-scene">
        <header className="login-scene-bar">
          <div className="login-scene-brand">
            <span className="login-scene-brand-mark" aria-hidden="true">
              <object className="h-10 w-10 border-0" type="image/svg+xml" data={LoginLogoMotion}>
                Logo AMP
              </object>
            </span>
            <div>
              <p className="eyebrow">AMP industrial access</p>
              <strong>AMP Usinagem</strong>
            </div>
          </div>

          <nav className="login-scene-nav" aria-label="Contexto">
            <span>Desktop</span>
            <span>Operacao</span>
            <span>{isBootstrap ? "Bootstrap" : "Suporte"}</span>
          </nav>

          <div className="login-scene-status">{isBootstrap ? "Bootstrap inicial" : "Acesso corporativo"}</div>
        </header>

        <div className="login-center-stage">
          <div className="login-logo-stage" aria-hidden="true">
            <object className="login-logo-object" type="image/svg+xml" data={LoginLogoMotion}>
              Logo AMP Usinagem
            </object>
          </div>

          <section className="login-auth-card">
            <p className="eyebrow">{isBootstrap ? "Bootstrap" : "Entrar"}</p>
            <h3>{heading}</h3>
            <p className="muted">{description}</p>

            {loadingBootstrap ? (
              <div className="amp-shell-loading login-loading-state">
                <div className="amp-shell-loader" />
                <p>Preparando o ambiente...</p>
              </div>
            ) : (
              <form onSubmit={isBootstrap ? handleBootstrap : handleLogin}>
                {isBootstrap && (
                  <label className="login-field">
                    <span>Administrador</span>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={updateField("nome")}
                      placeholder="Nome do administrador"
                      required
                    />
                  </label>
                )}

                <label className="login-field">
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    placeholder="usuario@ampusinagem.com"
                    required
                  />
                </label>

                <label className="login-field">
                  <span>{isBootstrap ? "Crie uma senha" : "Senha"}</span>
                  <input
                    type="password"
                    value={form.senha}
                    onChange={updateField("senha")}
                    placeholder={isBootstrap ? "Defina a senha inicial" : "Digite sua senha"}
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`primary-button login-submit ${submitting ? "is-loading" : ""}`}
                >
                  {submitting ? "Processando..." : isBootstrap ? "Criar administrador" : "Entrar no sistema"}
                </button>
              </form>
            )}

            <p className="helper-note">
              {isBootstrap
                ? "Primeiro acesso com perfil total."
                : "Acesso interno liberado pela administracao."}
            </p>
          </section>
        </div>

        <div className="login-scenery" aria-hidden="true">
          <span className="login-cloud cloud-a" />
          <span className="login-cloud cloud-b" />
          <span className="login-star-field" />
          <span className="login-range range-back" />
          <span className="login-range range-front" />
          <span className="login-tree-line trees-left" />
          <span className="login-tree-line trees-right" />
          <span className="login-water-line" />
        </div>
      </section>
    </div>
  );
}
