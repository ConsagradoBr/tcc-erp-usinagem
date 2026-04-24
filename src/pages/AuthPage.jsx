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
import newLoginMockup from "../assets/new-login.svg";

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
  const passwordDescribedBy = [
    "login-senha-hint",
    fieldErrors.senha ? "login-senha-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="figma-login-shell">
      <section className="figma-login-canvas" aria-labelledby="figma-login-title">
        <img
          src={newLoginMockup}
          alt=""
          className="figma-login-art"
          draggable="false"
        />

        <h1 id="figma-login-title" className="figma-login-sr-only">
          Acesse o sistema
        </h1>

        {loadingBootstrap ? (
          <div className="figma-login-loading" role="status" aria-live="polite">
            Preparando o ambiente...
          </div>
        ) : (
          <form
            className={`figma-login-form${isBootstrap ? " is-bootstrap" : ""}`}
            onSubmit={isBootstrap ? handleBootstrap : handleLogin}
            noValidate
            aria-busy={submitting}
          >
            {formError ? (
              <div className="figma-login-error" role="alert" aria-live="assertive">
                {formError}
              </div>
            ) : null}

            {isBootstrap && (
              <label
                className={`figma-login-control figma-login-admin${fieldErrors.nome ? " is-invalid" : ""}`}
              >
                <span className="figma-login-sr-only">Administrador</span>
                <input
                  type="text"
                  value={form.nome}
                  onChange={updateField("nome")}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.nome)}
                  aria-describedby={fieldErrors.nome ? "login-nome-error" : undefined}
                  required
                />
                {fieldErrors.nome ? (
                  <small id="login-nome-error" className="figma-login-field-error">
                    {fieldErrors.nome}
                  </small>
                ) : null}
              </label>
            )}

            <label
              className={`figma-login-control figma-login-email${fieldErrors.email ? " is-invalid" : ""}`}
            >
              <span className="figma-login-sr-only">E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={updateField("email")}
                autoComplete="username"
                inputMode="email"
                spellCheck={false}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                required
              />
              {fieldErrors.email ? (
                <small id="login-email-error" className="figma-login-field-error">
                  {fieldErrors.email}
                </small>
              ) : null}
            </label>

            <label
              className={`figma-login-control figma-login-password${fieldErrors.senha ? " is-invalid" : ""}`}
            >
              <span className="figma-login-sr-only">
                {isBootstrap ? "Crie uma senha" : "Senha"}
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={form.senha}
                onChange={updateField("senha")}
                autoComplete={isBootstrap ? "new-password" : "current-password"}
                aria-invalid={Boolean(fieldErrors.senha)}
                aria-describedby={passwordDescribedBy}
                required
              />
              <small id="login-senha-hint" className="figma-login-sr-only">
                {isBootstrap
                  ? "Minimo de 8 caracteres, com letra maiuscula, minuscula e numero."
                  : "Use a senha vinculada a este ambiente local."}
              </small>
              {fieldErrors.senha ? (
                <small id="login-senha-error" className="figma-login-field-error">
                  {fieldErrors.senha}
                </small>
              ) : null}
            </label>

            <button
              type="button"
              className="figma-login-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            />

            <button
              type="submit"
              disabled={submitting}
              className="figma-login-submit"
              aria-label={isBootstrap ? "Criar administrador" : "Entrar no sistema"}
            />
          </form>
        )}
      </section>
    </main>
  );
}
