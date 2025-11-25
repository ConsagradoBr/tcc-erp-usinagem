import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

import {
  Logo,
  GoogleIcon,
  AppleIcon,
  FacebookIcon
} from "../assets/assets-map";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isLogin) {
        const res = await api.post("/login", { email, senha });
        if (res.data?.token) {
          localStorage.setItem("token", res.data.token);
          toast.success("Login realizado!");
          navigate("/dashboard");
        }
      } else {
        await api.post("/usuarios", { nome, email, senha });
        toast.success("Conta criada com sucesso!");
        setIsLogin(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        <div className="flex justify-center mb-6">
          <img src={Logo} alt="logo" className="w-24" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-4">
          {isLogin ? "Entrar" : "Criar conta"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {!isLogin && (
            <input
              placeholder="Nome completo"
              className="p-3 border rounded"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          )}

          <input
            type="email"
            placeholder="E-mail"
            className="p-3 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            className="p-3 border rounded"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <button className="mt-2 py-3 bg-gray-900 text-white rounded-md">
            {isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="mt-4 flex gap-3">
          <button className="flex-1 p-2 bg-[#1877F2] text-white rounded">
            <img src={FacebookIcon} className="w-5 mx-auto" />
          </button>
          <button className="flex-1 p-2 bg-white border rounded">
            <img src={GoogleIcon} className="w-5 mx-auto" />
          </button>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          {isLogin ? "Não tem conta?" : "Já tem conta?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-semibold ml-1"
          >
            {isLogin ? "Cadastrar" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
