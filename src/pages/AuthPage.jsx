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
import ampLogo from "../assets/amp-logo-login.svg";
import LoginLogoAnimation from "../components/LoginLogoAnimation";

const initialForm = { nome: "", email: "", senha: "" };
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 8;

function FieldIcon({ name }) {
  switch (name) {
    case "user":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.75 6.75h16.5v10.5H3.75z" />
          <path d="m4.5 7.5 7.5 6 7.5-6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="10.5" width="16" height="10" rx="2" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        </svg>
      );
  }
}

function VisibilityIcon({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M9.9 4.25A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.2 18.2 0 0 1-3.32 4.21" />
        <path d="M6.18 6.18A18.1 18.1 0 0 0 1 12s4 8 11 8a10.8 10.8 0 0 0 5.1-1.27" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);

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
  const stageEyebrow = loadingBootstrap
    ? "Preparando ambiente"
    : isBootstrap
      ? "Bootstrap guiado"
      : "Acesso operacional";
  const stageTitle = loadingBootstrap
    ? "Validando o ambiente local da AMP Usinagem."
    : isBootstrap
      ? "Prepare o primeiro acesso administrativo do ERP."
      : "Entre no ERP com leitura clara e operacao segura.";
  const stageDescription = loadingBootstrap
    ? "Checamos a disponibilidade do ambiente e o estado inicial do sistema antes de liberar o acesso."
    : isBootstrap
      ? "O primeiro administrador define o ponto de partida da operacao local e libera o uso interno do sistema."
      : "O fluxo de autenticacao foi organizado para uso interno no desktop, com foco em clareza, controle e continuidade operacional.";
  const contextItems = isBootstrap
    ? [
        {
          label: "Provisionamento",
          value: "Primeiro administrador criado localmente, sem dependencia de servicos externos.",
        },
        {
          label: "Seguranca",
          value: "A senha inicial passa por validacao minima antes da liberacao do ambiente.",
        },
        {
          label: "Destino",
          value: "Depois da autenticacao, o sistema libera a administracao inicial do ERP.",
        },
      ]
    : [
        {
          label: "Ambiente",
          value: "ERP local-first preparado para uso interno da operacao e do desktop.",
        },
        {
          label: "Controle",
          value: "Permissoes e redirecionamento sao aplicados conforme o perfil autenticado.",
        },
        {
          label: "Continuidade",
          value: "Sessao persistida para retomar o trabalho sem perda de contexto.",
        },
      ];
  const authFacts = isBootstrap
    ? [
        { label: "Modo", value: "Bootstrap inicial" },
        { label: "Sessao", value: "Persistida no primeiro acesso" },
      ]
    : [
        { label: "Modo", value: "Credencial interna" },
        { label: "Destino", value: "Rota definida pelo perfil" },
      ];
  const visualTags = isBootstrap
    ? ["Provisionamento local", "Controle inicial", "ERP industrial"]
    : ["Desktop local-first", "Controle interno", "AMP industrial"];
  const statusLabel = loadingBootstrap
    ? "Verificando ambiente"
    : isBootstrap
      ? "Bootstrap inicial pendente"
      : "Ambiente pronto para autenticacao";
  const passwordDescribedBy = [
    "login-senha-hint",
    fieldErrors.senha ? "login-senha-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="login-shell">
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
              <p className="eyebrow">ERP industrial local</p>
              <strong>AMP Usinagem</strong>
            </div>
          </div>

          <div className="login-scene-meta" aria-label="Contexto do ambiente">
            <span className="login-meta-chip">Desktop</span>
            <span className="login-meta-chip">Operacao interna</span>
            <span className="login-meta-chip is-soft">
              {isBootstrap ? "Bootstrap guiado" : "Acesso corporativo"}
            </span>
          </div>

          <div className="login-scene-status" role="status" aria-live="polite">
            <span className="login-status-dot" aria-hidden="true" />
            {statusLabel}
          </div>
        </header>

        <div className="login-stage-grid">
          <section className="login-stage" aria-labelledby="login-stage-title">
            <div className="login-stage-copy">
              <p className="eyebrow">{stageEyebrow}</p>
              <h1 id="login-stage-title">{stageTitle}</h1>
              <p className="muted">{stageDescription}</p>

              <dl className="login-context-list" aria-label="Contexto do acesso">
                {contextItems.map((item) => (
                  <div key={item.label} className="login-context-item">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="login-visual-stage" aria-hidden="true">
              <div className="login-visual-shell">
                <div className="login-visual-bar">
                  {visualTags.map((tag) => (
                    <span key={tag} className="login-visual-chip">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="login-logo-stage">
                  <img
                    src={ampLogo}
                    alt=""
                    className="login-logo-fallback"
                    draggable="false"
                  />
                  <div className="login-logo-motion-layer">
                    <LoginLogoAnimation />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="login-auth-panel">
            <div className="login-auth-card">
              <div className="login-auth-top">
                <div>
                  <p className="eyebrow">
                    {loadingBootstrap
                      ? "Acesso"
                      : isBootstrap
                        ? "Bootstrap inicial"
                        : "Acesso interno"}
                  </p>
                  <h2>{heading}</h2>
                  <p className="muted">{description}</p>
                </div>

                <span className="login-auth-badge">
                  {isBootstrap ? "PASSO 01" : "ERP AMP"}
                </span>
              </div>

              <div className="login-auth-strip" aria-label="Resumo do fluxo">
                {authFacts.map((item) => (
                  <div key={item.label} className="login-auth-fact">
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>

              {loadingBootstrap ? (
                <div className="amp-shell-loading login-loading-state" role="status" aria-live="polite">
                  <div className="amp-shell-loader" />
                  <p>Preparando o ambiente...</p>
                </div>
              ) : (
                <form
                  className="login-form"
                  onSubmit={isBootstrap ? handleBootstrap : handleLogin}
                  noValidate
                  aria-busy={submitting}
                >
                  {formError ? (
                    <div className="login-form-alert is-error" role="alert" aria-live="assertive">
                      {formError}
                    </div>
                  ) : null}

                  {isBootstrap && (
                    <label className="login-field">
                      <div className="login-field-row">
                        <span>Administrador</span>
                      </div>
                      <div className={`login-input-wrap${fieldErrors.nome ? " is-invalid" : ""}`}>
                        <span className="login-field-icon">
                          <FieldIcon name="user" />
                        </span>
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
                      </div>
                      {fieldErrors.nome ? (
                        <small id="login-nome-error" className="login-field-error">
                          {fieldErrors.nome}
                        </small>
                      ) : null}
                    </label>
                  )}

                  <label className="login-field">
                    <div className="login-field-row">
                      <span>E-mail</span>
                    </div>
                    <div className={`login-input-wrap${fieldErrors.email ? " is-invalid" : ""}`}>
                      <span className="login-field-icon">
                        <FieldIcon name="email" />
                      </span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={updateField("email")}
                        placeholder="usuario@ampusinagem.com"
                        autoComplete="username"
                        inputMode="email"
                        spellCheck={false}
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                        required
                      />
                    </div>
                    {fieldErrors.email ? (
                      <small id="login-email-error" className="login-field-error">
                        {fieldErrors.email}
                      </small>
                    ) : null}
                  </label>

                  <label className="login-field">
                    <div className="login-field-row">
                      <span>{isBootstrap ? "Crie uma senha" : "Senha"}</span>
                      <small className="login-field-side-note">
                        {isBootstrap ? "Regra minima obrigatoria" : "Credencial de acesso local"}
                      </small>
                    </div>
                    <div className={`login-input-wrap${fieldErrors.senha ? " is-invalid" : ""}`}>
                      <span className="login-field-icon">
                        <FieldIcon name="password" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.senha}
                        onChange={updateField("senha")}
                        placeholder={isBootstrap ? "Defina a senha inicial" : "Digite sua senha"}
                        autoComplete={isBootstrap ? "new-password" : "current-password"}
                        aria-invalid={Boolean(fieldErrors.senha)}
                        aria-describedby={passwordDescribedBy}
                        required
                      />
                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                      >
                        <VisibilityIcon visible={showPassword} />
                      </button>
                    </div>
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

              <div className="login-auth-footer">
                <p className="helper-note">
                  {isBootstrap
                    ? "Primeiro acesso com perfil total e validacao local de credenciais."
                    : "Use a conta vinculada a este ambiente local para seguir ao modulo correto."}
                </p>
                <div className="login-auth-trust">
                  <span>Autenticacao local</span>
                  <span>Redirecionamento por perfil</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
