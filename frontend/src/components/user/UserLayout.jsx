import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import posefit_logo from "../../assets/posefit_logo.png";

import {
  LayoutDashboard,
  UserCheck,
  LogOut,
  Star,
  MessageSquare,
  Utensils,
  Dumbbell,
  X,
  PanelLeft,
  PanelRight,
  Menu,
} from "lucide-react";

const NAV_ITEMS = [
  {
    path: "/user/dashboard",
    Icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    path: "/user/chatbot",
    Icon: MessageSquare,
    label: "Chatbot",
  },
  {
    path: "/user/dietplan",
    Icon: Utensils,
    label: "Diet Plan",
  },
  {
    path: "/user/workout",
    Icon: Dumbbell,
    label: "Workout",
  },
  {
    path: "/user/professionals",
    Icon: UserCheck,
    label: "Browse Professionals",
  },
  {
    path: "/user/reviews",
    Icon: Star,
    label: "Reviews",
  },
];

export default function UserLayout({ children }) {
  const navigate = useNavigate();

  // =========================================================
  // MOBILE SIDEBAR STATE
  // =========================================================
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // =========================================================
  // DESKTOP SIDEBAR STATE
  // =========================================================
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem("user-sidebar-open");

    if (savedState === null) return true;

    return savedState === "true";
  });

  // =========================================================
  // TOGGLE DESKTOP SIDEBAR
  // =========================================================
  const toggleSidebar = () => {
    setSidebarOpen((previousState) => {
      const newState = !previousState;

      localStorage.setItem("user-sidebar-open", String(newState));

      return newState;
    });
  };

  // =========================================================
  // GET USER FROM LOCAL STORAGE
  // =========================================================
  const getStoredUser = () => {
    try {
      const storedUser = localStorage.getItem("pose-fit-user");

      if (!storedUser) return null;

      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to read user from localStorage:", error);

      return null;
    }
  };

  const user = getStoredUser();

  // =========================================================
  // LOGOUT
  // =========================================================
  const handleLogout = () => {
    localStorage.removeItem("pose-fit");
    localStorage.removeItem("pose-fit-user");
    localStorage.removeItem("posefit-token");
    localStorage.removeItem("posefit-user");

    navigate("/user/login", {
      replace: true,
    });
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-surface font-sans">
      {/* =====================================================
          BACKGROUND THEME
      ====================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-light/35 blur-3xl" />

        <div className="absolute right-[-100px] top-[15%] h-72 w-72 rounded-full bg-accent-blue/35 blur-3xl" />

        <div className="absolute bottom-[-120px] left-[35%] h-80 w-80 rounded-full bg-accent-orange/25 blur-3xl" />

        <div className="absolute left-[45%] top-[20%] h-72 w-72 rounded-full bg-white/40 blur-3xl" />
      </div>

      {/* =====================================================
          MOBILE HAMBURGER BUTTON
      ====================================================== */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileMenuOpen}
        className="
          fixed
          left-4
          top-4
          z-[60]
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-btn
          border
          border-brand-light/60
          bg-surface/95
          text-brand-dark
          shadow-card
          backdrop-blur-xl
          transition-all
          duration-200
          hover:bg-brand-light/30
          active:scale-95
          md:hidden
        "
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* =====================================================
          MOBILE BACKDROP
      ====================================================== */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="
            fixed
            inset-0
            z-[70]
            bg-black/30
            backdrop-blur-[2px]
            md:hidden
          "
          aria-hidden="true"
        />
      )}

      {/* =====================================================
          MOBILE DRAWER
      ====================================================== */}
      <div
        className={`
          fixed
          inset-y-0
          left-0
          z-[80]
          flex
          w-[min(82vw,320px)]
          flex-col
          border-r
          border-brand-light/50
          bg-surface/95
          shadow-2xl
          backdrop-blur-xl
          transition-transform
          duration-300
          ease-in-out
          md:hidden
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* ===================================================
            MOBILE DRAWER HEADER
        ==================================================== */}
        <div className="flex min-h-[96px] items-center justify-between border-b border-brand-light/50 px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-10 w-10 object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="text-lg font-extrabold tracking-tight text-gray-800">
                Pose
                <span className="text-brand-dark">Fit</span>
              </p>

              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Customer Portal
              </p>
            </div>
          </div>

          {/* CLOSE BUTTON */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-btn
              border
              border-brand-light/50
              bg-white/70
              text-gray-600
              transition-all
              hover:bg-brand-light/30
              hover:text-brand-dark
              active:scale-95
            "
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ===================================================
            MOBILE NAVIGATION
        ==================================================== */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            User Menu
          </p>

          <div className="space-y-1.5">
            {NAV_ITEMS.map(({ path, Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/user/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-btn px-4 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-brand-light/40 text-brand-dark shadow-xs"
                      : "text-gray-600 hover:bg-brand-light/20 hover:text-brand-dark"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive ? "text-brand-dark" : "text-gray-400"
                      }`}
                    />

                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ===================================================
            MOBILE DRAWER FOOTER
        ==================================================== */}
        <div className="border-t border-brand-light/50 bg-white/30 p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-extrabold text-gray-800">
                {user
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : "User"}
              </p>

              <p className="truncate text-[11px] font-medium text-gray-400">
                {user?.email || ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-btn
              bg-gray-800
              px-4
              py-2.5
              text-xs
              font-bold
              text-white
              shadow-xs
              transition-all
              hover:bg-gray-700
              active:scale-[0.98]
            "
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />

            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* =====================================================
          DESKTOP SIDEBAR
          HIDDEN ON MOBILE
      ====================================================== */}
      <aside
        className={`
          relative
          z-10
          hidden
          shrink-0
          border-r
          border-brand-light/50
          bg-surface/85
          backdrop-blur-xl
          transition-all
          duration-300
          md:flex
          md:flex-col
          ${sidebarOpen ? "md:w-64" : "md:w-20"}
        `}
      >
        {/* ===================================================
            DESKTOP HEADER
        ==================================================== */}
        <div
          className={`
            dashboard-sidebar-header
            border-brand-light/40
            ${sidebarOpen ? "h-24 px-6 py-6" : "h-24 px-2 py-3"}
          `}
        >
          {/* SIDEBAR TOGGLE */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className={`
              dashboard-sidebar-toggle
              ${sidebarOpen ? "right-3" : "right-1"}
            `}
          >
            {sidebarOpen ? (
              <PanelLeft className="h-[17px] w-[17px]" />
            ) : (
              <PanelRight className="h-[17px] w-[17px]" />
            )}
          </button>

          {/* BRAND */}
          <div
            className={`
              dashboard-brand-wrapper
              ${sidebarOpen ? "mt-4 gap-3" : "mt-8 justify-center"}
            `}
          >
            <div className="dashboard-logo border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-10 w-10 object-contain"
              />
            </div>

            {sidebarOpen && (
              <div className="min-w-0 overflow-hidden whitespace-nowrap">
                <p className="dashboard-brand-name">
                  Pose
                  <span className="dashboard-brand-highlight">Fit</span>
                </p>

                <p className="dashboard-portal-name">Customer Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================
            DESKTOP NAVIGATION
        ==================================================== */}
        <nav className={`dashboard-nav ${sidebarOpen ? "px-3" : "px-2"}`}>
          {sidebarOpen && <p className="dashboard-menu-title">User Menu</p>}

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/user/dashboard"}
              title={!sidebarOpen ? label : ""}
              className={({ isActive }) =>
                `dashboard-nav-link ${
                  sidebarOpen ? "gap-3 px-3 py-3" : "justify-center px-2 py-3"
                } ${
                  isActive
                    ? "dashboard-nav-link-active"
                    : "dashboard-nav-link-inactive"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`dashboard-nav-icon h-5 w-5 ${
                      isActive
                        ? "dashboard-nav-icon-active"
                        : "dashboard-nav-icon-inactive"
                    }`}
                  />

                  {sidebarOpen && (
                    <span className="overflow-hidden whitespace-nowrap">
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ===================================================
            DESKTOP FOOTER
        ==================================================== */}
        <div
          className={`
            dashboard-sidebar-footer
            border-brand-light/50
            bg-white/30
            ${sidebarOpen ? "p-3" : "p-2"}
          `}
        >
          <div
            className={`
              dashboard-user-wrapper
              transition-all
              duration-300
              ${sidebarOpen ? "mb-3 gap-3 px-1" : "mb-2 justify-center"}
            `}
          >
            <div className="dashboard-logo h-10 w-10 border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-9 w-9 object-contain"
              />
            </div>

            {sidebarOpen && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="dashboard-user-name">
                  {user
                    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                    : "User"}
                </p>

                <p className="dashboard-user-email">{user?.email || ""}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={!sidebarOpen ? "Logout" : ""}
            className={`dashboard-logout ${
              sidebarOpen
                ? "w-full justify-center gap-2 px-4 py-2"
                : "w-full justify-center py-2"
            }`}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />

            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN AREA
      ====================================================== */}
      <div className="dashboard-main-wrapper relative z-10 min-w-0 flex-1 overflow-y-auto">
        {/* Mobile top spacing so hamburger doesn't overlap content */}
        <div className="md:hidden h-14" />

        <main className="dashboard-content bg-transparent">{children}</main>
      </div>
    </div>
  );
}
