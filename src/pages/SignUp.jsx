import { useState } from "react";
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

  async function handleSignup(event) {
    event.preventDefault();

    if (senha !== confirmarSenha) {
      toast.error("As senhas nao coincidem.");
      return;
    }

    try {
      await api.post("/usuarios", { nome, email, senha });
      toast.success("Conta criada com sucesso!");
      navigate("/login");
    } catch (error) {
      toast.error("Erro ao criar conta.");
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
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder="Senha"
            className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            value={confirmarSenha}
            onChange={(event) => setConfirmarSenha(event.target.value)}
            placeholder="Confirmar senha"
            className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white"
          >
            Criar conta
          </button>
        </form>

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
