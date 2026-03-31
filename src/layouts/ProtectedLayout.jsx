import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { canAccessPath, clearSession, getDefaultAppRoute, getStoredToken, getStoredUser, setStoredUser } from "../auth";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1360 : true));
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
      <div className="amp-shell-loading">
        <div className="amp-shell-loader" />
        <p>Sincronizando a mesa operacional...</p>
      </div>
    );
  }

  return (
    <div className={`amp-shell-layout amp-ui-scale ${open ? "is-expanded" : "is-collapsed"}`}>
      <Sidebar user={user} open={open} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="amp-shell-workspace">
        <Header user={user} onMenuToggle={toggleMenu} />

        <main className="amp-shell-scroll">
          <div className="mx-auto w-full max-w-[1760px]">
            <Outlet context={{ user }} />
          </div>
        </main>
      </div>
    </div>
  );
}
