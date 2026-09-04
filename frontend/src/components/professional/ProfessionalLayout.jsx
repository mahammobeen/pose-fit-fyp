import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { deleteToken, getUser } from "../../lib/local-storage";
import posefit_logo from "../../assets/posefit_logo.png";

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

      localStorage.setItem("professional-sidebar-open", String(newState));

      return newState;
    });
  };

  const handleLogout = () => {
    deleteToken();
    localStorage.removeItem("pose-fit-user");
    navigate("/professional/login");
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

              <p className="dashboard-portal-name">Professional Portal</p>
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
          <p className="dashboard-menu-title">Professional Menu</p>

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

        {/* Mobile Footer */}
        <div className="dashboard-sidebar-footer border-brand-light/50 bg-white/30 p-4">
          <div className="dashboard-user-wrapper mb-3 gap-3">
            {/* PoseFit Logo */}
            <div className="dashboard-logo h-10 w-10 border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="dashboard-user-name">
                {user?.name ||
                  (user?.firstName
                    ? `${user.firstName} ${user.lastName || ""}`.trim()
                    : "Professional")}
              </p>

              <p className="dashboard-user-email">
                {user?.professionalType || "Trainer"} • {user?.email || ""}
              </p>
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
        {/* Sidebar Header */}
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

                <p className="dashboard-portal-name">Professional Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className={`dashboard-nav ${sidebarOpen ? "px-3" : "px-2"}`}>
          {sidebarOpen && (
            <p className="dashboard-menu-title">Professional Menu</p>
          )}

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
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

        {/* Desktop Footer */}
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
            {/* PoseFit Logo */}
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
                  {user?.name ||
                    (user?.firstName
                      ? `${user.firstName} ${user.lastName || ""}`.trim()
                      : "Professional")}
                </p>

                <p className="dashboard-user-email">
                  {user?.professionalType || "Trainer"} • {user?.email || ""}
                </p>
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
        {/* Mobile Header */}
        <header className="dashboard-header border-brand-light/50 bg-surface/80 backdrop-blur-xl lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="dashboard-mobile-menu-button"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <p className="truncate text-sm font-bold text-stone-800">
              Professional Portal
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="dashboard-mobile-logout"
          >
            <IconLogOut className="h-3.5 w-3.5" />

            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Page Content */}
        <main className="dashboard-content bg-transparent">{children}</main>
      </div>
    </div>
  );
}
