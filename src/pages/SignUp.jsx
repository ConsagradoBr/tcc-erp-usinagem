import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../api";
import {
  AuthSideImg,
  IconApple,
  IconFacebook,
  IconGoogle,
  LogoMain,
} from "../assets/assets-map";

export default function SignUp() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const response = await api.get("/auth/bootstrap-status");
        if (!active) return;
        setBootstrapRequired(Boolean(response.data?.bootstrap_required));
      } catch (error) {
        if (!active) return;
        setStatusError("Nao foi possivel verificar o estado do sistema.");
      } finally {
        if (active) setStatusLoading(false);
      }
    };

    loadStatus();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignup(event) {
    event.preventDefault();

    if (senha !== confirmarSenha) {
      toast.error("As senhas nao coincidem.");
      return;
    }

    try {
      await api.post("/auth/usuarios", { nome, email, senha });
      toast.success("Conta criada com sucesso!");
      navigate("/login");
    } catch (error) {
      const message = error.response?.data?.erro || "Erro ao criar conta.";
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-100">
      <div className="hidden flex-1 items-center justify-center bg-white lg:flex">
        <img src={AuthSideImg} alt="Ilustracao de cadastro" className="max-w-md" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <img src={LogoMain} alt="Logo AMP Usinagem" className="mb-8 w-40" />

        <form onSubmit={handleSignup} className="w-full max-w-md space-y-4">
          <input
            type="text"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Nome completo"
            className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={statusLoading}
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={statusLoading}
          />
          <input
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder="Senha"
            className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={statusLoading}
          />
          <input
            type="password"
            value={confirmarSenha}
            onChange={(event) => setConfirmarSenha(event.target.value)}
            placeholder="Confirmar senha"
            className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={statusLoading}
          />

          <button
            type="submit"
            disabled={statusLoading}
            className="mt-2 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {statusLoading ? "Verificando..." : "Criar conta"}
          </button>
        </form>

        {statusError ? (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            {statusError}
          </div>
        ) : null}

        {!statusLoading ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {bootstrapRequired
              ? "Nenhum usuario existe. O primeiro cadastro sera criado como administrador."
              : "Crie sua conta para acessar o sistema imediatamente."}
          </div>
        ) : null}

        <div className="mt-6 flex gap-4">
          <img
            src={IconGoogle}
            alt="Entrar com Google"
            className="w-10 cursor-pointer rounded-xl bg-gray-200 p-2"
          />
          <img
            src={IconApple}
            alt="Entrar com Apple"
            className="w-10 cursor-pointer rounded-xl bg-gray-200 p-2"
          />
          <img
            src={IconFacebook}
            alt="Entrar com Facebook"
            className="w-10 cursor-pointer rounded-xl bg-gray-200 p-2"
          />
        </div>
      </div>
    </div>
  );
}
