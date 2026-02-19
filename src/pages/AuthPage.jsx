import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

import {
  LogoMain,
  IconGoogle,
  IconApple,
  IconFacebook
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
        // Tenta realizar o login
        const res = await api.post("/login", { email, senha });
        if (res.data?.token) {
          localStorage.setItem("token", res.data.token);
          toast.success("Login realizado com sucesso!");
          navigate("/app/dashboard");
        }
      } else {
        // Tenta realizar o cadastro
        await api.post("/usuarios", { nome, email, senha });
        toast.success("Conta criada com sucesso! Agora faça login.");
        setIsLogin(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar a solicitação. Verifique seus dados.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          {/* Logo atualizada para LogoMain */}
          <img src={LogoMain} alt="logo" className="w-24 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">
            {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
          </h2>
          <p className="text-gray-500 text-sm text-center">
            {isLogin ? "Acesse sua conta para continuar" : "Preencha os dados abaixo para se cadastrar"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Nome completo"
              className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="E-mail"
            className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <button 
            type="submit"
            className="mt-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md"
          >
            {isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <span className="relative px-4 bg-white text-sm text-gray-400">ou continue com</span>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center">
              <img src={IconFacebook} alt="Facebook" className="w-5" />
            </button>
            <button className="flex-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center">
              <img src={IconGoogle} alt="Google" className="w-5" />
            </button>
            <button className="flex-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center">
              <img src={IconApple} alt="Apple" className="w-5" />
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
          {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-bold hover:underline"
          >
            {isLogin ? "Crie uma agora" : "Faça login"}
          </button>
        </p>
      </div>
    </div>
  );
}