import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

import {
  Logo,
  GoogleIcon,
  AppleIcon,
  FacebookIcon,
  EsquerdaLogo
} from "../assets/assets-map";

export default function SignUp() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  async function handleSignup(e) {
    e.preventDefault();

    if (!nome || !email || !senha || !confirmarSenha) {
      toast.error("Preencha todos os campos.");
      return;
    }

    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    try {
      await api.post("/usuarios", { nome, email, senha });
      toast.success("Conta criada com sucesso!");
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar conta.");
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-gray-100 overflow-hidden">

      <div className="hidden md:flex w-1/2 bg-white justify-center items-center p-10 border-r">
        <img
          src={EsquerdaLogo}
          alt="Imagem lateral"
          className="max-w-[420px] drop-shadow-lg"
        />
      </div>

      <div className="flex flex-col w-full md:w-1/2 justify-center items-center px-10 py-12 bg-white">

        <img src={Logo} alt="logo" className="w-36 mb-8" />

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Criar sua conta</h1>

        <p className="text-gray-500 mb-6">Preencha seus dados para começar.</p>

        <form onSubmit={handleSignup} className="w-full max-w-md flex flex-col gap-4">

          <div>
            <label className="text-gray-700 font-medium">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300"
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label className="text-gray-700 font-medium">E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full p-3 rounded-xl border border-gray-300"
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <label className="text-gray-700 font-medium">Senha</label>
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              type="password"
              className="w-full p-3 rounded-xl border border-gray-300"
              placeholder="Crie uma senha"
            />
          </div>

          <div>
            <label className="text-gray-700 font-medium">Confirmar senha</label>
            <input
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              type="password"
              className="w-full p-3 rounded-xl border border-gray-300"
              placeholder="Repita sua senha"
            />
          </div>

          <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl mt-2">
            Criar conta
          </button>
        </form>

        <div className="flex items-center gap-3 my-6 w-full max-w-md">
          <div className="flex-1 h-[1px] bg-gray-300" />
          <span className="text-gray-500 text-sm">ou entrar com</span>
          <div className="flex-1 h-[1px] bg-gray-300" />
        </div>

        <div className="flex gap-4">
          <button className="p-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition">
            <img src={GoogleIcon} className="w-6" />
          </button>
          <button className="p-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition">
            <img src={AppleIcon} className="w-6" />
          </button>
          <button className="p-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition">
            <img src={FacebookIcon} className="w-6" />
          </button>
        </div>

        <p className="text-gray-600 mt-6">
          Já tem conta?
          <button
            onClick={() => navigate("/login")}
            className="text-blue-600 font-semibold ml-1 hover:underline"
          >
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
