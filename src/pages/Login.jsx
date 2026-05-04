import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoGif from "../assets/gif_transparente.png";
import api from "../api";
import { persistSession, getDefaultAppRoute } from "../auth";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const navigate = useNavigate();

  const handleOpenSignup = () => {
    navigate("/signup");
  };

  useEffect(() => {
    let active = true;

    const checkBootstrapStatus = async () => {
      try {
        const response = await api.get("/auth/bootstrap-status");
        if (!active) return;
        setBootstrapRequired(Boolean(response.data?.bootstrap_required));
      } catch {
        if (!active) return;
        setError("Nao foi possivel verificar o estado inicial do sistema.");
      }
    };

    checkBootstrapStatus();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Informe seu e-mail e senha para continuar.");
      setLoading(false);
      return;
    }

    if (bootstrapRequired && !name) {
      setError("Informe o nome do administrador inicial.");
      setLoading(false);
      return;
    }

    try {
      if (bootstrapRequired) {
        await api.post("/auth/usuarios", {
          nome: name,
          email,
          senha: password,
        });
      }

      const response = await api.post("/auth/login", {
        email,
        senha: password,
      });
      const { token, user } = response.data;
      persistSession(token, user);
      const defaultRoute = getDefaultAppRoute(user);
      navigate(defaultRoute);
    } catch (err) {
      const errorMessage = err.response?.data?.erro || "Erro ao fazer login. Tente novamente.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-900">

      <div className="
        relative flex w-1/2 items-center justify-center
        bg-white overflow-hidden
      ">
        <img
          src={logoGif}
          alt="AMP Usinagem"
          className="
            w-[100%] max-w-lg object-contain
            [mix-blend-mode:multiply]
            select-none pointer-events-none
          "
          draggable={false}
        />

        <div className="absolute right-0 top-0 h-full w-px bg-neutral-200" />
      </div>

      <div className="
        relative flex w-1/2 flex-col items-center justify-center
        bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500
        px-8 py-10
      ">

        <div className="
          w-full max-w-md
          rounded-2xl
          bg-white/20 backdrop-blur-sm
          border border-white/35
          shadow-xl
          px-10 py-10
        ">

          <div className="mb-7 flex justify-center">
            <svg
              className="h-20 w-20 text-orange-500"
              viewBox="0 0 64 64"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#1c1c1c"
                d="M27.5 4 26.4 9.8a19 19 0 0 0-4.2 1.7l-5-3.4-6.6 6.6 3.4 5a19 19 0 0 0-1.7 4.2L6.5 25v9.8l5.8 1.1a19 19 0 0 0 1.7 4.2l-3.4 5 6.6 6.6 5-3.4a19 19 0 0 0 4.2 1.7l1.1 5.8h9.8L38.4 50a19 19 0 0 0 4.2-1.7l5 3.4 6.6-6.6-3.4-5a19 19 0 0 0 1.7-4.2l5.8-1.1V25l-5.8-1.1a19 19 0 0 0-1.7-4.2l3.4-5-6.6-6.6-5 3.4A19 19 0 0 0 38.4 9.8L37.3 4h-9.8z"
              />
              {/* círculo branco interno */}
              <circle cx="32" cy="30" r="15.5" fill="white" />
              {/* silhueta pessoa */}
              <circle cx="32" cy="29" r="5.5" fill="#1c1c1c" />
              <path
                d="M21 47c0-6.1 4.9-11 11-11s11 4.9 11 11"
                fill="#1c1c1c"
              />
            </svg>
          </div>

          <h1 className="mb-7 text-center text-2xl font-semibold tracking-wide text-neutral-900">
            Acesse o sistema
          </h1>

          {error && (
            <div className="
              mb-5 flex items-center gap-2 rounded-lg
              border border-red-300 bg-red-100/50
              px-4 py-2.5 text-sm text-red-700
            ">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[11px] font-bold tracking-[3px] text-neutral-700 uppercase"
              >
                E-mail
              </label>
              <div className="relative flex items-center">
                <svg
                  className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-500"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="
                    w-full rounded-xl border border-white/70 bg-white/55
                    py-3 pl-10 pr-4
                    text-sm text-neutral-800 placeholder-neutral-400
                    outline-none transition
                    focus:border-orange-700 focus:ring-2 focus:ring-orange-500/30
                  "
                />
              </div>
            </div>

            {bootstrapRequired && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="name"
                  className="text-[11px] font-bold tracking-[3px] text-neutral-700 uppercase"
                >
                  Nome do administrador
                </label>
                <div className="relative flex items-center">
                  <svg
                    className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-500"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  >
                    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                    <path d="M5 19a7 7 0 0 1 14 0" />
                  </svg>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Nome completo"
                    className="
                      w-full rounded-xl border border-white/70 bg-white/55
                      py-3 pl-10 pr-4
                      text-sm text-neutral-800 placeholder-neutral-400
                      outline-none transition
                      focus:border-orange-700 focus:ring-2 focus:ring-orange-500/30
                    "
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-[11px] font-bold tracking-[3px] text-neutral-700 uppercase"
                >
                  Senha
                </label>
                <button
                  type="button"
                  className="text-xs text-neutral-600 transition hover:text-neutral-900 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative flex items-center">
                <svg
                  className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-500"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="
                    w-full rounded-xl border border-white/70 bg-white/55
                    py-3 pl-10 pr-11
                    text-sm text-neutral-800 placeholder-neutral-400
                    outline-none transition
                    focus:border-orange-700 focus:ring-2 focus:ring-orange-500/30
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3.5 text-neutral-500 transition hover:text-neutral-800"
                >
                  {showPwd ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="
                mt-1 flex w-full items-center justify-center gap-3
                rounded-xl border-2 border-neutral-800/65
                bg-white/30 py-3
                text-sm font-semibold tracking-wider text-neutral-900
                shadow-sm transition-all duration-200
                hover:border-neutral-900 hover:bg-white/50 hover:shadow-md
                active:scale-[0.98]
                disabled:cursor-not-allowed disabled:opacity-60
              "
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
              ) : (
                <>
                  <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  {bootstrapRequired ? "Criar administrador e entrar" : "Entrar no sistema"}
                  <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-600">
            Não tem acesso?{" "}
            <button
              type="button"
              onClick={handleOpenSignup}
              className="font-bold text-neutral-900 transition hover:underline"
            >
              Fale com o administrador
            </button>
          </p>
        </div>

      </div>
    </div>
    
  );
}