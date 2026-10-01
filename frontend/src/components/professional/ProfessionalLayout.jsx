import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { deleteToken, getUser } from "../../lib/local-storage";
import posefit_logo from "../../assets/posefit_logo.png";

import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  DollarSign,
  Settings,
  LogOut,
  X,
  Menu,
  PanelLeft,
  PanelRight,
} from "lucide-react";

const NAV_ITEMS = [
  {
    path: "/professional/dashboard",
    Icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    path: "/professional/bookings",
    Icon: ClipboardList,
    label: "My Bookings",
  },
  {
    path: "/professional/availability",
    Icon: Clock,
    label: "Availability",
  },
  {
    path: "/professional/earnings",
    Icon: DollarSign,
    label: "Earnings",
  },
  {
    path: "/professional/profile",
    Icon: Settings,
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

    navigate("/user/login", {
      replace: true,
    });
  };

  const getProfessionalName = () => {
    if (user?.name) return user.name;

    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

    return fullName || "Professional";
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
          className="
            fixed
            inset-0
            z-[70]
            bg-black/30
            backdrop-blur-[2px]
            md:hidden
          "
        />
      )}

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

        <div className="flex h-24 shrink-0 items-center justify-between border-b border-brand-light/50 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="dashboard-logo border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-10 w-10 object-contain"
              />
            </div>

            <div className="min-w-0">
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
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-btn
              border
              border-brand-light/60
              bg-white/70
              text-gray-600
              transition
              hover:bg-brand-light/30
              hover:text-brand-dark
              active:scale-95
            "
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="dashboard-nav flex-1 overflow-y-auto px-4 py-5">
          <p className="dashboard-menu-title">Professional Menu</p>

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/professional/dashboard"}
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

        <div className="dashboard-sidebar-footer shrink-0 border-brand-light/50 bg-white/30 p-4">
          <div className="dashboard-user-wrapper mb-3 gap-3">
            <div className="dashboard-logo h-10 w-10 border border-brand-light/60 bg-white/80 shadow-card">
              <img
                src={posefit_logo}
                alt="PoseFit"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="dashboard-user-name">{getProfessionalName()}</p>

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
            <LogOut className="h-3.5 w-3.5 shrink-0" />

            <span>Logout</span>
          </button>
        </div>
      </div>

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

        <div
          className={`
            dashboard-sidebar-header
            border-brand-light/40
            ${sidebarOpen ? "h-24 px-6 py-6" : "h-24 px-2 py-3"}
          `}
        >

          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={`dashboard-sidebar-toggle ${
              sidebarOpen ? "right-3" : "left-1/2 -translate-x-1/2"
            }`}
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

        <nav
          className={`dashboard-nav flex-1 overflow-y-auto ${
            sidebarOpen ? "px-3" : "px-2"
          }`}
        >
          {sidebarOpen && (
            <p className="dashboard-menu-title">Professional Menu</p>
          )}

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/professional/dashboard"}
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

        <div
          className={`dashboard-sidebar-footer shrink-0 border-brand-light/50 bg-white/30 ${
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
                <p className="dashboard-user-name">{getProfessionalName()}</p>

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
            <LogOut className="h-3.5 w-3.5 shrink-0" />

            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="relative z-10 min-w-0 flex-1 overflow-y-auto">

        <header
          className="
            sticky
            top-0
            z-[50]
            flex
            h-14
            items-center
            justify-between
            border-b
            border-brand-light/50
            bg-surface/90
            px-4
            backdrop-blur-xl
            md:hidden
          "
        >
          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-btn
                border
                border-brand-light/60
                bg-surface/95
                text-brand-dark
                shadow-card
                transition-all
                duration-200
                hover:bg-brand-light/30
                active:scale-95
              "
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <p className="truncate text-sm font-bold text-stone-800">
              Professional Portal
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="
              flex
              shrink-0
              items-center
              gap-2
              rounded-btn
              px-2
              py-2
              text-sm
              font-semibold
              text-gray-600
              transition
              hover:bg-brand-light/30
              hover:text-brand-dark
            "
          >
            <LogOut className="h-4 w-4" />

            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <main className="dashboard-content bg-transparent">{children}</main>
      </div>
    </div>
  );
}
