import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Package, ScanLine, Menu, X, ShieldCheck, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import api from "@/app/services/api";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = useAuth((s) => s.role);
  const logout = useAuth((s) => s.logout);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await api.delete("/auth/logout");
    } catch {
      // ignore — token may already be invalid
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  };

  const navigation = [
    { name: "Inventaire", href: "/", icon: Package },
...(role === "admin" ? [{ name: "Administration", href: "/administration", icon: ShieldCheck }] : []),
    ...(role !== "read" ? [{ name: "Entrée multiple via documents", href: "/ocr", icon: ScanLine }] : []),
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform bg-white border-r border-gray-200 w-64 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full px-3 py-4 flex flex-col">
          <div className="flex items-center justify-between mb-8 px-3">
            <h2 className="text-xl font-bold text-gray-800">
              Inventaire
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <ul className="space-y-2 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center p-3 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            onClick={handleLogout}
            className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 transition-all">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                Système de gestion d'inventaire
              </h1>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="px-2 py-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
