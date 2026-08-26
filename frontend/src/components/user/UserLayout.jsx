import { NavLink, useNavigate } from "react-router-dom";
import { IconDashboard, IconProfessional, IconLogOut } from "../admin/Icons";
import { FiMessageSquare } from "react-icons/fi";
import { GiMeal } from "react-icons/gi";
import { MdFitnessCenter } from "react-icons/md";

const NAV_ITEMS = [
  {
    path: "/user/dashboard",
    Icon: IconDashboard,
    label: "Dashboard",
  },
  {
    path: "/user/chatbot",
    Icon: FiMessageSquare,
    label: "Chatbot",
  },
  {
    path: "/user/dietplan",
    Icon: GiMeal,
    label: "Diet Plan",
  },
  {
    path: "/user/workout",
    Icon: MdFitnessCenter,
    label: "Workout",
  },
  {
    path: "/user/professionals",
    Icon: IconProfessional,
    label: "Browse Professionals",
  },
];

export default function UserLayout({ children }) {
  const navigate = useNavigate();

  // Get logged-in user directly from localStorage
  const getStoredUser = () => {
    try {
      const storedUser = localStorage.getItem("pose-fit-user");

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to read user from localStorage:", error);
      return null;
    }
  };

  const user = getStoredUser();

  const handleLogout = () => {
    // Remove authentication data
    localStorage.removeItem("posefit-token");
    localStorage.removeItem("posefit-user");

    // Optional: remove old auth key if it exists
    localStorage.removeItem("pose-fit");

    navigate("/login", { replace: true });
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#f8fafc" }}
    >
      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-stone-200">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black text-white"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              P
            </div>

            <div>
              <p className="font-black text-lg tracking-tight leading-none text-stone-800">
                PoseFit
              </p>

              <p className="text-xs font-bold mt-1 text-emerald-600">
                Customer Portal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
          <p className="text-[11px] font-extrabold uppercase tracking-widest px-3 mb-2 text-stone-400">
            User Menu
          </p>

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/user/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-emerald-700" : "text-stone-400"
                    }`}
                  />

                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-stone-100 bg-stone-50">
          <div className="flex items-center gap-3 px-1 mb-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              {user?.firstName?.[0]?.toUpperCase() || "U"}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-stone-800">
                {user
                  ? `${user.firstName || ""} ${user.lastName || ""}`
                  : "User"}
              </p>

              <p className="text-xs font-medium truncate text-stone-400">
                {user?.email || ""}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
          >
            <IconLogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-stone-200 px-8 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-700">
            Welcome, {user?.firstName || "User"} {user?.lastName || ""}
          </h2>

          <div className="flex items-center gap-4">
            <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Customer Account
            </span>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
            >
              <IconLogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-stone-50">{children}</main>
      </div>
    </div>
  );
}
