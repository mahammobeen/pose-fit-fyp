import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getUser, deleteToken} from "../../lib/local-storage";

import posefit_logo from "../../assets/posefit_logo.png";

import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  CreditCard,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeft,
  PanelRight,
} from "lucide-react";

const NAV_ITEMS = [
  {
    path: "/admin/dashboard",
    Icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    path: "/admin/users",
    Icon: Users,
    label: "Users",
  },
  {
    path: "/admin/professionals",
    Icon: UserCheck,
    label: "Professionals",
  },
  {
    path: "/admin/requests",
    Icon: ClipboardList,
    label: "Pro Requests",
  },
  {
    path: "/admin/payments",
    Icon: CreditCard,
    label: "Payments",
  },
  {
    path: "/admin/reviews",
    Icon: Star,
    label: "Reviews",
  },
  {
    path: "/admin/settings",
    Icon: Settings,
    label: "Settings",
  },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = getUser();

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

  const handleLogout = () => {
    deleteToken();

    localStorage.removeItem("pose-fit-user");

    navigate("/admin/login", {
      replace: true,
    });
  };

  const getUserName = () => {
    if (user?.name) return user.name;

    const fullName = `${user?.firstName || ""} ${
      user?.lastName || ""
    }`.trim();

    return fullName || "Admin";
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-surface font-sans">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-light/35 blur-3xl" />

        <div className="absolute right-[-100px] top-[15%] h-72 w-72 rounded-full bg-accent-blue/35 blur-3xl" />

        <div className="absolute bottom-[-120px] left-[35%] h-80 w-80 rounded-full bg-accent-orange/25 blur-3xl" />

        <div className="absolute left-[45%] top-[20%] h-72 w-72 rounded-full bg-white/40 blur-3xl" />
      </div>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="dashboard-mobile-backdrop"
        />
      )}

      <div
        className={`dashboard-mobile-drawer border-r border-brand-light/50 bg-surface/95 backdrop-blur-xl ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="dashboard-nav px-4">
          <p className="dashboard-menu-title">Admin Menu</p>

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/admin/dashboard"}
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
              <p className="dashboard-user-name">{getUserName()}</p>

              <p className="dashboard-user-email">
                {user?.email || ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="dashboard-logout w-full justify-center gap-2 px-4 py-2"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />

            <span>Logout</span>
          </button>
        </div>
      </div>

      <aside
        className={`dashboard-sidebar relative z-10 border-r border-brand-light/50 bg-surface/85 backdrop-blur-xl ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div
          className={`dashboard-sidebar-header border-brand-light/40 ${
            sidebarOpen ? "h-24 px-6 py-6" : "h-24 px-2 py-3"
          }`}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className={`dashboard-sidebar-toggle ${
              sidebarOpen ? "right-3" : "left-1/2 -translate-x-1/2"
            }`}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeft className="h-[17px] w-[17px]" />
            ) : (
              <PanelRight className="h-[17px] w-[17px]" />
            )}
          </button>

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
              <div className="min-w-0">
                <p className="dashboard-brand-name">
                  Pose
                  <span className="dashboard-brand-highlight">Fit</span>
                </p>

                <p className="dashboard-portal-name">Admin Control</p>
              </div>
            )}
          </div>
        </div>

        <nav
          className={`dashboard-nav ${
            sidebarOpen ? "px-3" : "px-2"
          }`}
        >
          {sidebarOpen && (
            <p className="dashboard-menu-title">Admin Menu</p>
          )}

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/admin/dashboard"}
              title={!sidebarOpen ? label : ""}
              className={({ isActive }) =>
                `dashboard-nav-link ${
                  sidebarOpen
                    ? "gap-3 px-3 py-3"
                    : "justify-center px-2 py-3"
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

        <div
          className={`dashboard-sidebar-footer border-brand-light/50 bg-white/30 ${
            sidebarOpen ? "p-3" : "p-2"
          }`}
        >
          <div
            className={`dashboard-user-wrapper transition-all duration-300 ${
              sidebarOpen
                ? "mb-3 gap-3 px-1"
                : "mb-2 justify-center"
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
                  {getUserName()}
                </p>

                <p className="dashboard-user-email">
                  {user?.email || ""}
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
            <LogOut className="h-3.5 w-3.5 shrink-0" />

            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="dashboard-main-wrapper relative z-10">
        <header className="dashboard-header border-brand-light/50 bg-surface/80 backdrop-blur-xl lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="dashboard-mobile-menu-button"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
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
            <LogOut className="h-4 w-4" />

            <span>Logout</span>
          </button>
        </header>

        <main className="dashboard-content bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}