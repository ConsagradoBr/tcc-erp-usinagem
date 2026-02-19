import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

import {
  LogoMain,
  IconGoogle,
  IconApple,
  IconFacebook,
  AuthSideImg
} from "../assets/assets-map";

export default function SignUp() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    try {
      await api.post("/usuarios", { nome, email, senha });
      toast.success("Conta criada com sucesso!");
      navigate("/login");
    } catch (err) {
      toast.error("Erro ao criar conta.");
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-gray-100">
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white">
        <img src={AuthSideImg} alt="Ilustração" className="max-w-md" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <img src={LogoMain} alt="Logo" className="w-40 mb-8" />
        <form onSubmit={handleSignup} className="w-full max-w-md space-y-4">
           {/* Inputs omitidos para brevidade, mas o padrão de imagem abaixo: */}
           <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl mt-2">
            Criar conta
          </button>
        </form>
        <div className="flex gap-4 mt-6">
          <img src={IconGoogle} className="w-10 p-2 bg-gray-200 rounded-xl cursor-pointer" />
          <img src={IconApple} className="w-10 p-2 bg-gray-200 rounded-xl cursor-pointer" />
          <img src={IconFacebook} className="w-10 p-2 bg-gray-200 rounded-xl cursor-pointer" />
        </div>
      </div>
    </div>
  );
}