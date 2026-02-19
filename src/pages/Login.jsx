import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";
import {
  LogoMain,
  AuthSideImg,
  IconGoogle,
  IconApple,
  IconFacebook,
  IconLogin
} from "../assets/assets-map";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/login", { email, senha });
      if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
        toast.success("Login realizado!");
        navigate("/app/dashboard");
      }
    } catch (error) {
      toast.error("Erro ao realizar login.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white border-r">
        <img src={AuthSideImg} alt="Login Illustration" className="max-w-md" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <img src={LogoMain} alt="Logo" className="w-32 mb-10" />
        
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <input 
            type="email" 
            placeholder="E-mail" 
            className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500" 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Senha" 
            className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500" 
            onChange={(e) => setSenha(e.target.value)} 
          />
          
          <button type="submit" className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
            <img src={IconLogin} className="w-5" alt="Login" />
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-8 flex gap-4">
          <button className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50"><img src={IconGoogle} className="w-6" alt="Google" /></button>
          <button className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50"><img src={IconFacebook} className="w-6" alt="Facebook" /></button>
        </div>
      </div>
    </div>
  );
}