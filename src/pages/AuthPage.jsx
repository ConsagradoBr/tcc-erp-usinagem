import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

import {
  LogoMain,
  IconGoogle,
  IconApple,
  IconFacebook,
  AuthSideImg,   // ← Ilustração do lado esquerdo (do seu Figma)
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
        const res = await api.post("/auth/login", { email, senha });
        if (res.data?.token) {
          localStorage.setItem("token", res.data.token);
          toast.success("Login realizado com sucesso!");
          navigate("/app/dashboard");
        }
      } else {
        await api.post("/auth/usuarios", { nome, email, senha });
        toast.success("Conta criada com sucesso! Agora faça login.");
        setIsLogin(true); // volta para tela de login
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar a solicitação. Verifique seus dados.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-b from-[#E68216] from-0% via-white/0 via-60% to-white/0 to-100%">
      {/* Lado esquerdo - Ilustração (exatamente como no Figma) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white relative overflow-hidden">
        <img 
          src={AuthSideImg} 
          alt="Ilustração" 
          className="max-w-[520px] drop-shadow-2xl" 
        />
        {/* Overlay sutil para dar profundidade */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent" />
      </div>

      {/* Lado direito - Formulário */}
      <div className="w-full lg:w-[30%] flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <img src={LogoMain} alt="AMP Usinagem" className="h-16" />
          </div>

          {/* Título */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="text-gray-600 mt-3 text-lg">
              {isLogin 
                ? "Acesse sua conta para continuar" 
                : "Preencha os dados abaixo para se cadastrar"}
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
                />
              </div>
            )}

            <div>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-xl transition-all active:scale-[0.985] shadow-lg shadow-blue-500/30"
            >
              {isLogin ? "Entrar no Sistema" : "Criar conta"}
            </button>
          </form>

          {/* Social Login */}
          <div className="mt-8">
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-6 text-sm text-gray-500">ou continue com</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button className="p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
                <img src={IconGoogle} alt="Google" className="w-6 h-6" />
              </button>
              <button className="p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
                <img src={IconFacebook} alt="Facebook" className="w-6 h-6" />
              </button>
              <button className="p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
                <img src={IconApple} alt="Apple" className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Toggle Login / Cadastro */}
          <p className="text-center mt-10 text-gray-600">
            {isLogin ? "Não tem uma conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 font-semibold hover:underline"
            >
              {isLogin ? "Crie uma agora" : "Faça login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}