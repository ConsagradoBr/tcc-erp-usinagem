import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

import {
  Logo,
  EsquerdaLogo,
  GoogleIcon,
  AppleIcon,
  FacebookIcon,
  EntrarIcon
} from "../assets/assets-map";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !senha) {
      toast.error("Preencha todos os campos.");
      return;
    }

    try {
      const response = await api.post("app/login", { email, senha });

      if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
        toast.success("Login realizado com sucesso!");
        navigate("/app/dashboard");
      } else {
        toast.error("Resposta inesperada do servidor.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Usuário ou senha incorretos.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-100">

      {/* Lado esquerdo */}
      <div className="hidden md:flex w-1/2 bg-white justify-center items-center p-10">
        <img
          src={EsquerdaLogo}
          alt="Logo Lateral"
          className="max-w-[420px] drop-shadow-lg"
        />
      </div>

      {/* Formulário */}
      <div className="flex flex-col w-full md:w-1/2 justify-center items-center p-10 bg-white">

        <img src={Logo} alt="Logo Principal" className="w-36 mb-5" />

        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          Bem-vindo de volta!
        </h1>

        <p className="text-gray-500 mb-6">
          Entre com seu e-mail e senha para continuar.
        </p>

        <form onSubmit={handleLogin} className="w-full max-w-md">

          <label className="block mb-3">
            <span className="text-gray-700 font-medium">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="exemplo@email.com"
            />
          </label>

          <label className="block mb-5">
            <span className="text-gray-700 font-medium">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Digite sua senha"
            />
          </label>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            <img src={EntrarIcon} className="w-5" alt="Entrar" />
            Entrar
          </button>
        </form>

        {/* Linha divisória */}
        <div className="flex items-center gap-3 my-6 w-full max-w-md">
          <div className="flex-1 h-[1px] bg-gray-300" />
          <span className="text-gray-500 text-sm">ou entre com</span>
          <div className="flex-1 h-[1px] bg-gray-300" />
        </div>

        {/* Redes sociais */}
        <div className="flex gap-4">
          <button className="p-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition">
            <img src={GoogleIcon} className="w-6" alt="Google" />
          </button>
          <button className="p-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition">
            <img src={AppleIcon} className="w-6" alt="Apple" />
          </button>
          <button className="p-3 bg-gray-200 rounded-xl hover:bg-gray-300 transition">
            <img src={FacebookIcon} className="w-6" alt="Facebook" />
          </button>
        </div>

        <p className="text-gray-600 mt-6">
          Não tem conta?
          <button
            onClick={() => navigate("/app/signup")}
            className="text-blue-600 font-semibold ml-1 hover:underline"
          >
            Criar conta
          </button>
        </p>
      </div>
    </div>
  );
}
