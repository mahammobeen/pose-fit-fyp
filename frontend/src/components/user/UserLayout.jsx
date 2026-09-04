import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import posefit_logo from "../../assets/posefit_logo.png";

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
    path: "/user/review",
    Icon: FiMessageSquare,
    label: "Review",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // =====================================================
  // DESKTOP SIDEBAR STATE
  // =====================================================

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem("user-sidebar-open");

    if (savedState === null) return true;

    return savedState === "true";
  });

  const toggleSidebar = () => {
    setSidebarOpen((previousState) => {
      const newState = !previousState;

      localStorage.setItem("user-sidebar-open", String(newState));

      return newState;
    });
  };

  // =====================================================
  // GET USER FROM LOCAL STORAGE
  // =====================================================

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

  // =====================================================
  // LOGOUT
  // =====================================================

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
      {/* =================================================
          BACKGROUND THEME
      ================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Green */}
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-light/35 blur-3xl" />

        {/* Blue */}
        <div className="absolute right-[-100px] top-[15%] h-72 w-72 rounded-full bg-accent-blue/35 blur-3xl" />

        {/* Orange */}
        <div className="absolute bottom-[-120px] left-[35%] h-80 w-80 rounded-full bg-accent-orange/25 blur-3xl" />

        {/* Soft White Glow */}
        <div className="absolute left-[45%] top-[20%] h-72 w-72 rounded-full bg-white/40 blur-3xl" />
      </div>

      {/* =================================================
          MOBILE BACKDROP
      ================================================= */}

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="dashboard-mobile-backdrop"
        />
      )}

      {/* =================================================
          MOBILE DRAWER
      ================================================= */}

      <div
        className={`dashboard-mobile-drawer border-r border-brand-light/50 bg-surface/95 backdrop-blur-xl ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Drawer Header */}

        <div className="dashboard-mobile-header border-brand-light/50">
          <div className="dashboard-brand-wrapper gap-3">
            <div className="dashboard-logo border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-10 w-10 object-contain"
              />
            </div>

            <div>
              <p className="dashboard-brand-name">
                Pose
                <span className="dashboard-brand-highlight">Fit</span>
              </p>

              <p className="dashboard-portal-name">Customer Portal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="dashboard-mobile-close"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Mobile Navigation Links */}

        <nav className="dashboard-nav px-4">
          <p className="dashboard-menu-title">User Menu</p>

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/user/dashboard"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `dashboard-nav-link gap-3 px-4 py-3 ${
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

                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Drawer Footer User Section */}

        <div className="dashboard-sidebar-footer border-brand-light/50 bg-white/30 p-4">
          <div className="dashboard-user-wrapper mb-3 gap-3">
            <div className="dashboard-logo h-10 w-10 border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="dashboard-user-name">
                {user
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : "User"}
              </p>

              <p className="dashboard-user-email">{user?.email || ""}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="dashboard-logout w-full justify-center gap-2 px-4 py-2"
          >
            <IconLogOut className="h-3.5 w-3.5 shrink-0" />

            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <aside
        className={`dashboard-sidebar relative z-10 border-r border-brand-light/50 bg-surface/85 backdrop-blur-xl ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Header */}

        <div
          className={`dashboard-sidebar-header border-brand-light/40 ${
            sidebarOpen ? "h-24 px-6 py-6" : "h-24 px-2 py-3"
          }`}
        >
          {/* Sidebar Toggle */}

          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className={`dashboard-sidebar-toggle ${
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
              <rect x="3" y="4" width="18" height="16" rx="2" />

              {sidebarOpen ? (
                <line x1="9" y1="4" x2="9" y2="20" />
              ) : (
                <line x1="15" y1="4" x2="15" y2="20" />
              )}
            </svg>
          </button>

          {/* Brand */}

          <div
            className={`dashboard-brand-wrapper ${
              sidebarOpen ? "mt-4 gap-3" : "mt-8 justify-center"
            }`}
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

        {/* Desktop Navigation */}

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

        {/* Desktop Footer User Section */}

        <div
          className={`dashboard-sidebar-footer border-brand-light/50 bg-white/30 ${
            sidebarOpen ? "p-3" : "p-2"
          }`}
        >
          <div
            className={`dashboard-user-wrapper transition-all duration-300 ${
              sidebarOpen ? "mb-3 gap-3 px-1" : "mb-2 justify-center"
            }`}
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
            <IconLogOut className="h-3.5 w-3.5 shrink-0" />

            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* =================================================
          MAIN AREA
      ================================================= */}

      <div className="dashboard-main-wrapper relative z-10">
        {/* Top Header REMOVED */}

        {/* Page Content */}

        <main className="dashboard-content bg-transparent">{children}</main>
      </div>
    </div>
  );
}
