import { Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen w-full flex bg-gray-100">
      <Outlet />
    </div>
  );
}
