import { Logo } from "../assets/assets-map";

export default function Home() {
  return (
    <div className="w-full flex flex-col justify-center items-center mt-20">
      <img src={Logo} className="w-40 mb-4" />
      <h1 className="text-3xl font-bold">Bem-vindo ao sistema AMP</h1>
      <p className="text-gray-500 mt-2">Selecione uma opção no menu lateral.</p>
    </div>
  );
}
