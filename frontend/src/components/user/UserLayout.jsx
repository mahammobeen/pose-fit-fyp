import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  IconDashboard,
  IconProfessional,
  IconLogOut,
} from "../admin/Icons";

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

  // =====================================================
  // SIDEBAR STATE
  // =====================================================
  // Desktop:
  // - First time = OPEN
  // - Remembers user's choice
  //
  // Mobile:
  // - Starts COLLAPSED
  // - Remains visible as icon-only sidebar
  // - Does NOT disappear
  // =====================================================

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Mobile starts collapsed
    if (window.innerWidth < 1024) {
      return false;
    }

    // Desktop remembers user's preference
    const savedState = localStorage.getItem("user-sidebar-open");

    if (savedState === null) {
      return true;
    }

    return savedState === "true";
  });

  // =====================================================
  // ADMIN-STYLE SIDEBAR TOGGLE
  // =====================================================

  const toggleSidebar = () => {
    setSidebarOpen((previousState) => {
      const newState = !previousState;

      // Only remember state for desktop
      if (window.innerWidth >= 1024) {
        localStorage.setItem(
          "user-sidebar-open",
          String(newState)
        );
      }

      return newState;
    });
  };

  // =====================================================
  // GET USER FROM LOCAL STORAGE
  // =====================================================

  const getStoredUser = () => {
    try {
      const storedUser = localStorage.getItem("pose-fit-user");

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser);
    } catch (error) {
      console.error(
        "Failed to read user from localStorage:",
        error
      );

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

    // Remove old keys if they exist
    localStorage.removeItem("posefit-token");
    localStorage.removeItem("posefit-user");

    navigate("/user/login", { replace: true });
  };

  // =====================================================
  // NAVIGATION
  // =====================================================

  const handleNavigation = () => {
    // Sidebar stays in current state.
    // Mobile remains visible in collapsed mode.
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#f8fafc" }}
    >
      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`
          relative
          flex-shrink-0
          flex flex-col
          bg-white
          border-r border-stone-200/80
          shadow-sm
          transition-all
          duration-300
          ease-in-out

          ${
            sidebarOpen
              ? "w-64"
              : "w-20"
          }
        `}
      >
        {/* =================================================
            SIDEBAR HEADER
        ================================================= */}

        <div
          className={`
            relative
            border-b border-stone-100
            transition-all
            duration-300

            ${
              sidebarOpen
                ? "px-6 py-6 h-24"
                : "px-2 py-3 h-24"
            }
          `}
        >
          {/* =================================================
              EXACT ADMIN TOGGLE BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={toggleSidebar}
            title={
              sidebarOpen
                ? "Close sidebar"
                : "Open sidebar"
            }
            className={`
              absolute
              top-3
              w-7
              h-7
              rounded-lg
              flex
              items-center
              justify-center
              text-stone-500
              hover:text-stone-800
              hover:bg-stone-100
              transition-all
              duration-200
              z-50

              ${
                sidebarOpen
                  ? "right-3"
                  : "right-1"
              }
            `}
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

          {/* =================================================
              LOGO
          ================================================= */}

          <div
            className={`
              flex
              items-center
              transition-all
              duration-300

              ${
                sidebarOpen
                  ? "gap-3 mt-4"
                  : "justify-center mt-8"
              }
            `}
          >
            {/* Logo */}

            <div
              className="
                w-10
                h-10
                rounded-2xl
                flex
                items-center
                justify-center
                text-xl
                font-black
                text-white
                shadow-sm
                flex-shrink-0
              "
              style={{
                background:
                  "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              P
            </div>

            {/* Logo Text */}

            {sidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <p className="font-black text-lg tracking-tight leading-none text-stone-800">
                  PoseFit
                </p>

                <p className="text-xs font-bold mt-0.5 text-emerald-600">
                  Customer Portal
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav
          className={`
            flex-1
            py-5
            space-y-1.5
            overflow-y-auto
            transition-all
            duration-300

            ${
              sidebarOpen
                ? "px-3.5"
                : "px-2"
            }
          `}
        >
          {/* Menu Heading */}

          {sidebarOpen && (
            <p
              className="
                text-[11px]
                font-extrabold
                uppercase
                tracking-widest
                px-3
                mb-2
                text-stone-400
                whitespace-nowrap
              "
            >
              User Menu
            </p>
          )}

          {/* Navigation Items */}

          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/user/dashboard"}
              onClick={handleNavigation}
              title={!sidebarOpen ? label : ""}
              className={({ isActive }) =>
                `
                  flex
                  items-center
                  rounded-2xl
                  text-sm
                  font-bold
                  transition-all
                  duration-200

                  ${
                    sidebarOpen
                      ? "gap-3 px-3.5 py-2.5"
                      : "justify-center px-2 py-3"
                  }

                  ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-sm"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 border border-transparent"
                  }
                `
              }
            >
              {({ isActive }) => (
                <>
                  {/* Icon */}

                  <Icon
                    className={`
                      w-5
                      h-5
                      shrink-0

                      ${
                        isActive
                          ? "text-emerald-700"
                          : "text-stone-400"
                      }
                    `}
                  />

                  {/* Label */}

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

        {/* =================================================
            USER SECTION
        ================================================= */}

        <div
          className={`
            border-t
            border-stone-100
            bg-stone-50/60
            transition-all
            duration-300

            ${
              sidebarOpen
                ? "p-4"
                : "p-2"
            }
          `}
        >
          {/* User Information */}

          <div
            className={`
              flex
              items-center
              transition-all
              duration-300

              ${
                sidebarOpen
                  ? "gap-3 px-1 mb-3"
                  : "justify-center mb-2"
              }
            `}
          >
            {/* Avatar */}

            <div
              className="
                w-9
                h-9
                rounded-xl
                flex
                items-center
                justify-center
                font-black
                text-sm
                text-white
                shrink-0
                shadow-sm
              "
              style={{
                background:
                  "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              {user?.firstName?.[0]?.toUpperCase() || "U"}
            </div>

            {/* User Details */}

            {sidebarOpen && (
              <div className="min-w-0 overflow-hidden">
                <p className="text-sm font-bold truncate text-stone-800">
                  {user
                    ? `${user.firstName || ""} ${
                        user.lastName || ""
                      }`.trim()
                    : "User"}
                </p>

                <p className="text-xs font-medium truncate text-stone-400">
                  {user?.email || ""}
                </p>
              </div>
            )}
          </div>

          {/* Logout */}

          <button
            type="button"
            onClick={handleLogout}
            title={!sidebarOpen ? "Logout" : ""}
            className={`
              flex
              items-center
              rounded-xl
              text-xs
              font-bold
              text-rose-700
              bg-rose-50
              hover:bg-rose-100
              border
              border-rose-200/60
              transition-all
              duration-200
              shadow-sm

              ${
                sidebarOpen
                  ? "w-full justify-center gap-2 px-4 py-2"
                  : "w-full justify-center py-2"
              }
            `}
          >
            <IconLogOut className="w-3.5 h-3.5 shrink-0" />

            {sidebarOpen && (
              <span>Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* =================================================
          MAIN AREA
      ================================================= */}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          className="
            h-16
            flex-shrink-0
            bg-white
            border-b border-stone-200
            px-4 lg:px-6
            flex items-center
            justify-between
            gap-4
          "
        >
          {/* LEFT SIDE */}

          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-bold text-stone-700 truncate">
              Welcome, {user?.firstName || "User"}{" "}
              {user?.lastName || ""}
            </h2>
          </div>

          {/* RIGHT SIDE */}

          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className="
                hidden sm:inline-flex
                text-xs
                font-extrabold
                uppercase
                tracking-widest
                px-3
                py-1
                rounded-full
                bg-emerald-100
                text-emerald-800
                border border-emerald-200
              "
            >
              Customer Account
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="
                hidden sm:flex
                px-3.5
                py-1.5
                rounded-xl
                text-xs
                font-bold
                text-rose-700
                bg-rose-50
                hover:bg-rose-100
                border border-rose-200
                transition-colors
                items-center
                gap-1.5
              "
            >
              <IconLogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main className="flex-1 overflow-y-auto bg-stone-50">
          {children}
        </main>
      </div>
    </div>
  );
}