import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { canAccessPath, clearSession, getDefaultAppRoute, getStoredToken, getStoredUser, setStoredUser } from "../auth";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1280 : true));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      clearSession();
      navigate("/login", { replace: true });
      setLoading(false);
      return;
    }

    let active = true;
    api
      .get("/auth/perfil")
      .then((response) => {
        if (!active) return;
        const nextUser = response.data?.user;
        setStoredUser(nextUser);
        setUser(nextUser);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        navigate("/login", { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    if (!canAccessPath(user, location.pathname)) {
      navigate(getDefaultAppRoute(user), { replace: true });
    }
  }, [location.pathname, navigate, user]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleMenu = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen((prev) => !prev);
      return;
    }
    setOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar user={user} open={open} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className={`min-h-screen flex flex-col transition-all duration-300 ${open ? "lg:pl-64" : "lg:pl-20"}`}>
        <Header user={user} onMenuToggle={toggleMenu} />

        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
