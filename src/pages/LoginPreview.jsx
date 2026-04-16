import { useState } from "react";
import { Link } from "react-router-dom";

import ampLogo from "../assets/amp-logo-login.svg";

const stats = [
  { value: "OS", label: "Ordens de servico" },
  { value: "NF", label: "Notas fiscais" },
  { value: "ERP", label: "Gestao integrada" },
];

export default function LoginPreview() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [modoBootstrap, setModoBootstrap] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro("");
    setCarregando(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 1100);
    });

    if (email.trim().toLowerCase().includes("erro")) {
      setErro("Preview de erro: credenciais invalidas.");
    }

    setCarregando(false);
  };

  return (
    <div className="amp-preview-shell">
      <div className="amp-preview-grid">
        <section className="amp-preview-left" aria-label="Identidade visual AMP">
          <div className="amp-preview-left-bar">
            <span className="amp-preview-chip">AMP industrial access</span>
            <span className="amp-preview-chip is-ghost">Preview visual</span>
          </div>

          <div className="amp-preview-left-copy">
            <p className="amp-preview-kicker">Sistema de gestao industrial</p>
            <h1>
              Precisao em
              <br />
              cada operacao
            </h1>
            <p>
              Visual isolado para validar o conceito da tela de acesso antes de
              integrar com a autenticacao oficial.
            </p>
          </div>

          <div className="amp-preview-stage" aria-hidden="true">
            <span className="amp-preview-stage-ring is-outer" />
            <span className="amp-preview-stage-ring is-inner" />
            <div className="amp-preview-logo-wrap">
              <img
                src={ampLogo}
                alt="Logo AMP Usinagem"
                className="amp-preview-logo-image amp-preview-logo-float"
                draggable="false"
              />
            </div>
          </div>

          <div className="amp-preview-stats">
            {stats.map((item) => (
              <article key={item.label} className="amp-preview-stat">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="amp-preview-right" aria-label="Formulario de acesso">
          <div className="amp-preview-panel">
            <div className="amp-preview-panel-top">
              <div>
                <p className="amp-preview-kicker">ERP AMP</p>
                <h2>{modoBootstrap ? "Configuracao inicial" : "Acesse sua conta"}</h2>
                <p className="amp-preview-subtitle">
                  {modoBootstrap
                    ? "Valide como o primeiro administrador vai entrar no sistema."
                    : "Use a rota de preview para fechar a casca antes de plugar no backend."}
                </p>
              </div>

              <div className="amp-preview-mode-switch" role="tablist" aria-label="Modo de preview">
                <button
                  type="button"
                  className={!modoBootstrap ? "is-active" : ""}
                  onClick={() => setModoBootstrap(false)}
                  aria-pressed={!modoBootstrap}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={modoBootstrap ? "is-active" : ""}
                  onClick={() => setModoBootstrap(true)}
                  aria-pressed={modoBootstrap}
                >
                  Bootstrap
                </button>
              </div>
            </div>

            <form className="amp-preview-form" onSubmit={handleSubmit}>
              {erro ? (
                <div className="amp-preview-alert" role="alert">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 7.5v5" />
                    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
                  </svg>
                  <span>{erro}</span>
                </div>
              ) : null}

              {modoBootstrap ? (
                <label className="amp-preview-field">
                  <span>Administrador</span>
                  <div className="amp-preview-input-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                      <path d="M5 19a7 7 0 0 1 14 0" />
                    </svg>
                    <input
                      type="text"
                      value={nome}
                      onChange={(event) => setNome(event.target.value)}
                      placeholder="Nome do administrador"
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>
              ) : null}

              <label className="amp-preview-field">
                <span>E-mail</span>
                <div className="amp-preview-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3.75 6.75h16.5v10.5H3.75z" />
                    <path d="m4.5 7.5 7.5 6 7.5-6" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@ampusinagem.com.br"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="amp-preview-field">
                <div className="amp-preview-field-row">
                  <span>{modoBootstrap ? "Crie uma senha" : "Senha"}</span>
                  <button type="button" className="amp-preview-link">
                    Esqueceu a senha?
                  </button>
                </div>

                <div className="amp-preview-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4" y="10.5" width="16" height="10" rx="2" />
                    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                  </svg>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    placeholder={modoBootstrap ? "Defina a senha inicial" : "Digite sua senha"}
                    autoComplete={modoBootstrap ? "new-password" : "current-password"}
                    required
                  />
                  <button
                    type="button"
                    className="amp-preview-eye"
                    onClick={() => setMostrarSenha((value) => !value)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 3l18 18" />
                        <path d="M9.9 4.25A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.2 18.2 0 0 1-3.32 4.21" />
                        <path d="M6.18 6.18A18.1 18.1 0 0 0 1 12s4 8 11 8a10.8 10.8 0 0 0 5.1-1.27" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                className={`amp-preview-submit${carregando ? " is-loading" : ""}`}
                disabled={carregando}
              >
                {carregando ? (
                  <>
                    <span className="amp-preview-spinner" aria-hidden="true" />
                    Processando preview
                  </>
                ) : (
                  <>
                    {modoBootstrap ? "Criar administrador" : "Entrar no sistema"}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="amp-preview-panel-footer">
              <span>Rota isolada para aprovacao visual</span>
              <Link to="/login" className="amp-preview-admin-link">
                Voltar ao login real
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
