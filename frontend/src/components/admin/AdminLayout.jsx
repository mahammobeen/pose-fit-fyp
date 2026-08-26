import { NavLink, useNavigate } from "react-router-dom";
import { deleteToken, getUser } from "../../lib/local-storage";
import {
  IconDashboard,
  IconUsers,
  IconProfessional,
  IconClipboard,
  IconPayment,
  IconSettings,
  IconLogOut,
} from "./Icons";

const NAV_ITEMS = [
  { path: "/admin/dashboard",     Icon: IconDashboard,     label: "Dashboard"       },
  { path: "/admin/users",         Icon: IconUsers,         label: "Users"           },
  { path: "/admin/professionals", Icon: IconProfessional,  label: "Professionals"  },
  { path: "/admin/requests",      Icon: IconClipboard,     label: "Pro Requests"    },
  { path: "/admin/payments",      Icon: IconPayment,       label: "Payments"        },
  { path: "/admin/settings",      Icon: IconSettings,      label: "Settings"        },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    deleteToken();
    navigate("/admin/login");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* ── Light Sidebar ── */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-stone-200/80 shadow-xs"
      >
        {/* Logo Header */}
        <div className="px-6 py-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-xs"
              style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}
            >
              P
            </div>
            <div>
              <p className="font-black text-lg tracking-tight leading-none text-stone-800">PoseFit</p>
              <p className="text-xs font-bold mt-0.5 text-emerald-600">Admin Control</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
          <p className="text-[11px] font-extrabold uppercase tracking-widest px-3 mb-2 text-stone-400">
            Main Menu
          </p>
          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-700" : "text-stone-400"}`} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/60">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-xs"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              {user?.firstName?.[0] || user?.name?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-stone-800">
                {user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Admin")}
              </p>
              <p className="text-xs font-medium truncate text-stone-400">{user?.email || ""}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-all shadow-xs"
          >
            <IconLogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-y-auto" style={{ background: "#f8fafc" }}>
        {children}
      </main>
    </div>
  );
}
