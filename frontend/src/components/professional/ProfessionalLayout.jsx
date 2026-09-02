import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { deleteToken, getUser } from "../../lib/local-storage";

import {
  IconDashboard,
  IconClipboard,
  IconClock,
  IconDollarSign,
  IconSettings,
  IconLogOut,
} from "../admin/Icons";

const NAV_ITEMS = [
  {
    path: "/professional/dashboard",
    Icon: IconDashboard,
    label: "Dashboard",
  },
  {
    path: "/professional/bookings",
    Icon: IconClipboard,
    label: "My Bookings",
  },
  {
    path: "/professional/availability",
    Icon: IconClock,
    label: "Availability",
  },
  {
    path: "/professional/earnings",
    Icon: IconDollarSign,
    label: "Earnings",
  },
  {
    path: "/professional/profile",
    Icon: IconSettings,
    label: "Profile Settings",
  },
];

export default function ProfessionalLayout({ children }) {
  const navigate = useNavigate();
  const user = getUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem("professional-sidebar-open");

    if (savedState === null) return true;

    return savedState === "true";
  });

  const toggleSidebar = () => {
    setSidebarOpen((previousState) => {
      const newState = !previousState;

      localStorage.setItem(
        "professional-sidebar-open",
        String(newState)
      );

      return newState;
    });
  };

  const handleLogout = () => {
    deleteToken();
    localStorage.removeItem("pose-fit-user");
    navigate("/professional/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-2xl lg:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-xs shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              P
            </div>

            <div>
              <p className="font-bold text-base tracking-tight leading-none text-gray-800">
                Pose<span className="text-[#53b889]">Fit</span>
              </p>

              <p className="text-[10px] font-extrabold mt-1 uppercase tracking-widest text-[#16845b]">
                Professional Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-extrabold uppercase tracking-widest px-3 mb-2 text-stone-400">
            Professional Menu
          </p>

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#B7E4C7]/30 text-[#16845b] border border-[#B7E4C7] shadow-2xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? "text-[#16845b]"
                        : "text-stone-400"
                    }`}
                  />

                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-100 bg-stone-50/60 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, #fb923c, #f97316)",
              }}
            >
              {user?.firstName?.[0] ||
                user?.name?.[0] ||
                "P"}
            </div>

            <div className="min-w-0 overflow-hidden">
              <p className="text-sm font-bold truncate text-stone-800">
                {user?.name ||
                  (user?.firstName
                    ? `${user.firstName} ${
                        user.lastName || ""
                      }`.trim()
                    : "Professional")}
              </p>

              <p className="text-xs font-medium truncate text-stone-400">
                {user?.professionalType || "Trainer"} •{" "}
                {user?.email || ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-all shadow-sm"
          >
            <IconLogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-stone-200/80 shadow-sm transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div
          className={`relative border-b border-stone-100 transition-all duration-300 ${
            sidebarOpen
              ? "px-6 py-6 h-24"
              : "px-2 py-3 h-24"
          }`}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            title={
              sidebarOpen
                ? "Close sidebar"
                : "Open sidebar"
            }
            className={`absolute top-3 w-7 h-7 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-all duration-200 z-50 ${
              sidebarOpen ? "right-3" : "right-1"
            }`}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
              />

              {sidebarOpen ? (
                <line
                  x1="9"
                  y1="4"
                  x2="9"
                  y2="20"
                />
              ) : (
                <line
                  x1="15"
                  y1="4"
                  x2="15"
                  y2="20"
                />
              )}
            </svg>
          </button>

          <div
            className={`flex items-center transition-all duration-300 ${
              sidebarOpen
                ? "gap-3 mt-4"
                : "justify-center mt-8"
            }`}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-sm flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              P
            </div>

            {sidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <p className="font-black text-lg tracking-tight leading-none text-stone-800">
                  PoseFit
                </p>

                <p className="text-xs font-bold mt-0.5 text-emerald-600">
                  Professional Portal
                </p>
              </div>
            )}
          </div>
        </div>

        <nav
          className={`flex-1 py-5 space-y-1.5 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? "px-3.5" : "px-2"
          }`}
        >
          {sidebarOpen && (
            <p className="text-[11px] font-extrabold uppercase tracking-widest px-3 mb-2 text-stone-400 whitespace-nowrap">
              Professional Menu
            </p>
          )}

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              title={!sidebarOpen ? label : ""}
              className={({ isActive }) =>
                `flex items-center rounded-2xl text-sm font-bold transition-all duration-200 ${
                  sidebarOpen
                    ? "gap-3 px-3.5 py-2.5"
                    : "justify-center px-2 py-3"
                } ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-sm"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? "text-emerald-700"
                        : "text-stone-400"
                    }`}
                  />

                  {sidebarOpen && (
                    <span className="whitespace-nowrap overflow-hidden">
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div
          className={`border-t border-stone-100 bg-stone-50/60 transition-all duration-300 ${
            sidebarOpen ? "p-4" : "p-2"
          }`}
        >
          <div
            className={`flex items-center transition-all duration-300 ${
              sidebarOpen
                ? "gap-3 px-1 mb-3"
                : "justify-center mb-2"
            }`}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, #fb923c, #f97316)",
              }}
            >
              {user?.firstName?.[0] ||
                user?.name?.[0] ||
                "P"}
            </div>

            {sidebarOpen && (
              <div className="min-w-0 overflow-hidden">
                <p className="text-sm font-bold truncate text-stone-800">
                  {user?.name ||
                    (user?.firstName
                      ? `${user.firstName} ${
                          user.lastName || ""
                        }`.trim()
                      : "Professional")}
                </p>

                <p className="text-xs font-medium truncate text-stone-400">
                  {user?.professionalType || "Trainer"} •{" "}
                  {user?.email || ""}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={!sidebarOpen ? "Logout" : ""}
            className={`flex items-center rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-all duration-200 shadow-sm ${
              sidebarOpen
                ? "w-full justify-center gap-2 px-4 py-2"
                : "w-full justify-center py-2"
            }`}
          >
            <IconLogOut className="w-3.5 h-3.5 shrink-0" />

            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full">
        <header className="lg:hidden h-16 flex-shrink-0 bg-white border-b border-stone-200 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              aria-label="Open navigation menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <p className="font-bold text-sm text-stone-800">
              Professional Portal
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
          >
            <IconLogOut className="w-3.5 h-3.5" />

            <span className="hidden sm:inline">
              Logout
            </span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}