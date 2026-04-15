import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../api";
import {
  clearSession,
  getDefaultAppRoute,
  getStoredToken,
  persistSession,
} from "../auth";
import LoginLogoAnimation from "../components/LoginLogoAnimation";

const initialForm = { nome: "", email: "", senha: "" };
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 8;

function normalizeEmail(value) {
  return (value || "").trim().toLowerCase();
}

function normalizeForm(values) {
  return {
    nome: (values.nome || "").trim(),
    email: normalizeEmail(values.email),
    senha: (values.senha || "").trim(),
  };
}

function validateForm(values, isBootstrap) {
  const errors = {};

  if (isBootstrap) {
    if (!values.nome) {
      errors.nome = "Nome e obrigatorio.";
    } else if (values.nome.length < 3) {
      errors.nome = "Nome precisa ter pelo menos 3 caracteres.";
    }
  }

  if (!values.email) {
    errors.email = "E-mail e obrigatorio.";
  } else if (!emailRegex.test(values.email)) {
    errors.email = "Informe um e-mail valido.";
  }

  if (!values.senha) {
    errors.senha = "Senha e obrigatoria.";
  } else if (isBootstrap) {
    if (values.senha.length < passwordMinLength) {
      errors.senha = `Senha precisa ter pelo menos ${passwordMinLength} caracteres.`;
    } else if (!/[A-Z]/.test(values.senha)) {
      errors.senha = "Senha precisa ter ao menos uma letra maiuscula.";
    } else if (!/[a-z]/.test(values.senha)) {
      errors.senha = "Senha precisa ter ao menos uma letra minuscula.";
    } else if (!/\d/.test(values.senha)) {
      errors.senha = "Senha precisa ter ao menos um numero.";
    }
  }

  return errors;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadBootstrapStatus = async () => {
      try {
        const response = await api.get("/auth/bootstrap-status");
        if (!active) return false;
        setBootstrapRequired(Boolean(response.data?.bootstrap_required));
        return true;
      } catch {
        if (!active) return false;
        toast.error("Nao foi possivel verificar o status inicial do sistema.");
        return false;
      }
    };

    const initializeAuth = async () => {
      const token = getStoredToken();

      if (token) {
        try {
          const response = await api.get("/auth/perfil");
          if (!active) return;
          navigate(getDefaultAppRoute(response.data?.user), { replace: true });
          return;
        } catch {
          if (!active) return;
          clearSession();
        }
      }

      await loadBootstrapStatus();

      if (active) {
        setLoadingBootstrap(false);
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, [navigate]);

  const refreshBootstrapStatus = async () => {
    const response = await api.get("/auth/bootstrap-status");
    const required = Boolean(response.data?.bootstrap_required);
    setBootstrapRequired(required);
    return required;
  };

  const updateField = (field) => (event) => {
    const nextValue = event.target.value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: "" };
    });
    setFormError("");
  };

  const finalizarLogin = (payload) => {
    persistSession(payload.token, payload.user);
    toast.success("Acesso liberado com sucesso!");
    navigate(getDefaultAppRoute(payload.user), { replace: true });
  };

  const submitWithValidation = async (handler, successMessage) => {
    const normalizedForm = normalizeForm(form);
    const errors = validateForm(normalizedForm, bootstrapRequired);

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError("Revise os campos destacados antes de continuar.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = await handler(normalizedForm);
      if (successMessage) {
        toast.success(successMessage);
      }
      finalizarLogin(response.data);
    } catch (error) {
      const message =
        error.response?.data?.erro ||
        "Nao foi possivel concluir a autenticacao local.";

      if (bootstrapRequired && [401, 403].includes(error.response?.status)) {
        try {
          const stillRequired = await refreshBootstrapStatus();
          if (!stillRequired) {
            setForm((prev) => ({ ...prev, nome: "" }));
          }
        } catch {
          // Keep the current error if the status refresh fails.
        }
      }

      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    await submitWithValidation(
      (normalizedForm) =>
        api.post("/auth/login", {
          email: normalizedForm.email,
          senha: normalizedForm.senha,
        }),
      ""
    );
  };

  const handleBootstrap = async (event) => {
    event.preventDefault();
    await submitWithValidation(async (normalizedForm) => {
      await api.post("/auth/usuarios", normalizedForm);
      return api.post("/auth/login", {
        email: normalizedForm.email,
        senha: normalizedForm.senha,
      });
    }, "Administrador inicial criado com sucesso!");
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
      ? "Crie o primeiro administrador com regras locais de acesso."
      : "Use uma conta AMP valida para entrar no ambiente local.";

  return (
    <div className="login-shell amp-ui-scale">
      <section className="login-scene">
        <header className="login-scene-bar">
          <div className="login-scene-brand">
            <span className="login-scene-brand-mark" aria-hidden="true">
              <span className="amp-emblem amp-emblem-compact">
                <span className="amp-emblem-gear" />
                <span className="amp-emblem-core">AMP</span>
              </span>
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

          <div className="login-scene-status">
            {isBootstrap ? "Bootstrap inicial" : "Acesso corporativo"}
          </div>
        </header>

        <section className="login-scene-copy">
          <p className="eyebrow">
            {isBootstrap ? "Configuracao guiada" : "Desktop local first"}
          </p>
          <h3>
            {isBootstrap
              ? "Prepare o acesso inicial do ERP sem depender de servicos externos."
              : "Volte para a leitura institucional do login com atmosfera AMP e acesso interno."}
          </h3>
          <p className="muted">
            {isBootstrap
              ? "O primeiro administrador libera o ambiente local do aplicativo e define o ponto de partida do uso interno."
              : "Fluxo pensado para operacao local no .exe, com autenticacao simples, identidade industrial e a mesma assinatura visual do conceito inicial."}
          </p>
        </section>

        <div className="login-center-stage">
          <div className="login-logo-stage" aria-hidden="true">
            <LoginLogoAnimation />
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
              <form onSubmit={isBootstrap ? handleBootstrap : handleLogin} noValidate>
                {formError ? (
                  <div className="login-form-alert is-error" role="alert">
                    {formError}
                  </div>
                ) : null}

                {isBootstrap && (
                  <label className="login-field">
                    <span>Administrador</span>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={updateField("nome")}
                      placeholder="Nome do administrador"
                      autoComplete="name"
                      aria-invalid={Boolean(fieldErrors.nome)}
                      aria-describedby={fieldErrors.nome ? "login-nome-error" : undefined}
                      required
                    />
                    {fieldErrors.nome ? (
                      <small id="login-nome-error" className="login-field-error">
                        {fieldErrors.nome}
                      </small>
                    ) : null}
                  </label>
                )}

                <label className="login-field">
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    placeholder="usuario@ampusinagem.com"
                    autoComplete="username"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                    required
                  />
                  {fieldErrors.email ? (
                    <small id="login-email-error" className="login-field-error">
                      {fieldErrors.email}
                    </small>
                  ) : null}
                </label>

                <label className="login-field">
                  <span>{isBootstrap ? "Crie uma senha" : "Senha"}</span>
                  <input
                    type="password"
                    value={form.senha}
                    onChange={updateField("senha")}
                    placeholder={
                      isBootstrap ? "Defina a senha inicial" : "Digite sua senha"
                    }
                    autoComplete={isBootstrap ? "new-password" : "current-password"}
                    aria-invalid={Boolean(fieldErrors.senha)}
                    aria-describedby="login-senha-hint login-senha-error"
                    required
                  />
                  <small id="login-senha-hint" className="login-field-hint">
                    {isBootstrap
                      ? "Minimo de 8 caracteres, com letra maiuscula, minuscula e numero."
                      : "Use a senha vinculada a este ambiente local."}
                  </small>
                  {fieldErrors.senha ? (
                    <small id="login-senha-error" className="login-field-error">
                      {fieldErrors.senha}
                    </small>
                  ) : null}
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`primary-button login-submit ${submitting ? "is-loading" : ""}`}
                >
                  {submitting
                    ? "Processando..."
                    : isBootstrap
                      ? "Criar administrador"
                      : "Entrar no sistema"}
                </button>
              </form>
            )}

            <p className="helper-note">
              {isBootstrap
                ? "Primeiro acesso com perfil total e sessao local persistida."
                : "Acesso interno liberado pela administracao local."}
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
