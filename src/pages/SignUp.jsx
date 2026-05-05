import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../assets/gif_transparente.png";

import api from "../api";
import {
  AuthSideImg,
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
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-gray-100">
      <div className="hidden md:flex md:flex-1 items-center justify-center bg-white">
        <img src={AuthSideImg} alt="Ilustracao de cadastro" className="max-w-md w-11/12 md:w-full" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-8 py-8 md:py-0">
        <img src={logo} alt="Logo AMP Usinagem" className="mb-8 w-40" />

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
      </div>
    </div>
  );
}
