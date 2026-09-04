import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { deleteToken, getUser } from "../../lib/local-storage";
import posefit_logo from "../../assets/posefit_logo.png";

import {
  IconDashboard,
  IconUsers,
  IconProfessional,
  IconClipboard,
  IconPayment,
  IconReview,
  IconSettings,
  IconLogOut,
} from "./Icons";

const NAV_ITEMS = [
  { path: "/admin/dashboard", Icon: IconDashboard, label: "Dashboard" },
  { path: "/admin/users", Icon: IconUsers, label: "Users" },
  {
    path: "/admin/professionals",
    Icon: IconProfessional,
    label: "Professionals",
  },
  {
    path: "/admin/requests",
    Icon: IconClipboard,
    label: "Pro Requests",
  },
  { path: "/admin/payments", Icon: IconPayment, label: "Payments" },
  { path: "/admin/reviews", Icon: IconReview, label: "Reviews" },
  { path: "/admin/settings", Icon: IconSettings, label: "Settings" },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // =====================================================
  // GET USER
  // =====================================================

  const user = getUser();

  // =====================================================
  // DESKTOP SIDEBAR STATE
  // =====================================================

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem("admin-sidebar-open");

    if (savedState === null) return true;

    return savedState === "true";
  });

  const toggleSidebar = () => {
    setSidebarOpen((previousState) => {
      const newState = !previousState;

      localStorage.setItem("admin-sidebar-open", String(newState));

      return newState;
    });
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    deleteToken();

    localStorage.removeItem("pose-fit-user");

    navigate("/admin/login", {
      replace: true,
    });
  };

  // =====================================================
  // USER NAME
  // =====================================================

  const getUserName = () => {
    if (user?.name) return user.name;

    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

    return fullName || "Admin";
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-surface font-sans">
      {/* =====================================================
          BACKGROUND THEME
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Green */}
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-light/35 blur-3xl" />

        {/* Blue */}
        <div className="absolute right-[-100px] top-[15%] h-72 w-72 rounded-full bg-accent-blue/35 blur-3xl" />

        {/* Orange */}
        <div className="absolute bottom-[-120px] left-[35%] h-80 w-80 rounded-full bg-accent-orange/25 blur-3xl" />

        {/* Soft white glow */}
        <div className="absolute left-[45%] top-[20%] h-72 w-72 rounded-full bg-white/40 blur-3xl" />
      </div>

      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      {mobileMenuOpen && (
        <div
          className="dashboard-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* =====================================================
          MOBILE DRAWER
      ===================================================== */}

      <aside
        className={`dashboard-mobile-drawer border-r border-brand-light/50 bg-surface/95 backdrop-blur-xl ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}

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

              <p className="dashboard-portal-name">Admin Control</p>
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

        {/* Mobile Navigation */}

        <nav className="dashboard-nav px-4">
          <p className="dashboard-menu-title">Admin Menu</p>

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
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

        {/* =====================================================
            MOBILE FOOTER
            SAME AS USERLAYOUT
        ===================================================== */}

        <div className="dashboard-sidebar-footer border-brand-light/50 bg-white/30 p-4">
          {/* User Information */}

          <div className="dashboard-user-wrapper mb-3 gap-3">
            <div className="dashboard-logo h-10 w-10 border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="dashboard-user-name">{getUserName()}</p>

              <p className="dashboard-user-email">{user?.email || ""}</p>
            </div>
          </div>

          {/* Logout */}

          <button
            type="button"
            onClick={handleLogout}
            className="dashboard-logout w-full justify-center gap-2 px-4 py-2"
          >
            <IconLogOut className="h-3.5 w-3.5 shrink-0" />

            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside
        className={`dashboard-sidebar relative z-10 border-r border-brand-light/50 bg-surface/85 backdrop-blur-xl ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Sidebar Header */}

        <div
          className={`dashboard-sidebar-header border-brand-light/40 ${
            sidebarOpen ? "h-20 px-5" : "h-20 px-3"
          }`}
        >
          <div
            className={`dashboard-brand-wrapper h-full ${
              sidebarOpen ? "gap-3" : "justify-center"
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
              <div className="min-w-0">
                <p className="dashboard-brand-name">
                  Pose
                  <span className="dashboard-brand-highlight">Fit</span>
                </p>

                <p className="dashboard-portal-name">Admin Control</p>
              </div>
            )}
          </div>

          {/* Sidebar Toggle */}

          <button
            type="button"
            onClick={toggleSidebar}
            className={`dashboard-sidebar-toggle ${
              sidebarOpen ? "right-3" : "left-1/2 -translate-x-1/2"
            }`}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarOpen ? "chevron_left" : "chevron_right"}
            </span>
          </button>
        </div>

        {/* Desktop Navigation */}

        <nav className={`dashboard-nav ${sidebarOpen ? "px-3" : "px-2"}`}>
          {sidebarOpen && <p className="dashboard-menu-title">Admin Menu</p>}

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `dashboard-nav-link ${
                  sidebarOpen ? "gap-3 px-3 py-3" : "justify-center px-2 py-3"
                } ${
                  isActive
                    ? "dashboard-nav-link-active"
                    : "dashboard-nav-link-inactive"
                }`
              }
              title={!sidebarOpen ? label : undefined}
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
                    <span className="whitespace-nowrap">{label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* =====================================================
            DESKTOP FOOTER
            SAME AS USERLAYOUT
        ===================================================== */}

        <div
          className={`dashboard-sidebar-footer border-brand-light/50 bg-white/30 ${
            sidebarOpen ? "p-3" : "p-2"
          }`}
        >
          {/* User Information */}

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
                <p className="dashboard-user-name">{getUserName()}</p>

                <p className="dashboard-user-email">{user?.email || ""}</p>
              </div>
            )}
          </div>

          {/* Logout Button */}

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

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div className="dashboard-main-wrapper relative z-10">
        {/* Mobile Header */}

        <header className="dashboard-header border-brand-light/50 bg-surface/80 backdrop-blur-xl lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="dashboard-mobile-menu-button"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-gray-800">
                Admin Portal
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="dashboard-mobile-logout"
          >
            <IconLogOut className="h-4 w-4" />

            <span>Logout</span>
          </button>
        </header>

        {/* Dashboard Content */}

        <main className="dashboard-content bg-transparent">{children}</main>
      </div>
    </div>
  );
}
