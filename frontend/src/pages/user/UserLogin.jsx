import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { IconAlertTriangle } from "../../components/admin/Icons";

export default function UserLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // TOAST
  const showToast = useCallback((message, type = "success") => {
    setToast({
      msg: message,
      type,
    });
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  // LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email.trim() || !form.password) {
      showToast("Email and password are required.", "error");
      return;
    }

    try {
      setLoading(true);

      const loginEmail = form.email.trim().toLowerCase();

      const res = await httpClient.post("/auth/login", {
        email: loginEmail,
        password: form.password,
      });

      console.log("LOGIN RESPONSE:", res.data);

      const { success, token, user } = res.data;

      // VALIDATE RESPONSE
      if (!success || !token || !user) {
        showToast("Invalid response from server.", "error");
        return;
      }

      // USER ID CHECK
      const userId = user?._id || user?.id || user?.userId;

      if (!userId) {
        console.error("User object does not contain an ID:", user);

        showToast("User ID was not received from server.", "error");
        return;
      }

      // ROLE VALIDATION
      const validRoles = ["USER", "ADMIN", "PROFESSIONAL"];

      if (!validRoles.includes(user.role)) {
        console.error("Unknown user role:", user.role);

        showToast("Invalid user role received from server.", "error");
        return;
      }

      // EMAIL VERIFICATION
      if (user.role === "USER" && !user.isVerified) {
        showToast("Please verify your email before logging in.", "error");
        return;
      }

      // NORMALIZE USER OBJECT
      const normalizedUser = {
        ...user,
        _id: user._id || user.id || user.userId,
      };

      // CLEAR OLD LOGIN DATA
      localStorage.removeItem("pose-fit");
      localStorage.removeItem("pose-fit-user");

      // SAVE AUTH DATA
      localStorage.setItem("pose-fit", token);

      localStorage.setItem(
        "pose-fit-user",
        JSON.stringify(normalizedUser)
      );

      // DEBUG
      console.log("SAVED TOKEN:", token);
      console.log("SAVED USER:", normalizedUser);
      console.log("SAVED USER ID:", normalizedUser._id);
      console.log("USER ROLE:", normalizedUser.role);

      // SUCCESS TOAST
      showToast("Login successful! Welcome to PoseFit.", "success");

      // ROLE-BASED REDIRECT
      let redirectPath = "/user/dashboard";

      if (user.role === "ADMIN") {
        redirectPath = "/admin/dashboard";
      } else if (user.role === "PROFESSIONAL") {
        const professionalStatus = (
          user.professionalStatus || ""
        ).toLowerCase();

        if (
          professionalStatus === "incomplete" ||
          professionalStatus === "invited" ||
          professionalStatus === "pending_verification" ||
          professionalStatus === "rejected"
        ) {
          redirectPath = "/professional/profile/complete";
        } else if (professionalStatus === "approved") {
          redirectPath = "/professional/dashboard";
        } else {
          redirectPath = "/professional/profile/complete";
        }
      } else if (user.role === "USER") {
        redirectPath =
          location.state?.from?.pathname || "/user/dashboard";
      }

      console.log("REDIRECTING TO:", redirectPath);

      setTimeout(() => {
        navigate(redirectPath, {
          replace: true,
        });
      }, 700);
    } catch (err) {
      console.error("Login error:", err);

      showToast(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Login failed. Please check your email and password.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 40%, #e0f2fe 100%)",
      }}
    >
      {/* BACKGROUND DECORATION */}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-40 blur-3xl"
          style={{
            background: "#bbf7d0",
          }}
        />

        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-40 blur-3xl"
          style={{
            background: "#bae6fd",
          }}
        />
      </div>

      {/* TOAST */}

      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border max-w-sm ${
            toast.type === "error"
              ? "bg-rose-500 border-rose-600"
              : "bg-emerald-600 border-emerald-700"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "error" && (
              <IconAlertTriangle className="w-4 h-4 shrink-0 text-white" />
            )}

            {toast.type === "success" && (
              <span className="text-base leading-none">✓</span>
            )}

            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* LOGIN CARD */}

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-stone-200/80 shadow-xl">

          {/* LOGO / HEADER */}

          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-sm mb-4"
              style={{
                background:
                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
            >
              P
            </div>

            <h1 className="text-2xl font-black text-stone-800 tracking-tight">
              PoseFit Login
            </h1>

            <p className="text-xs text-stone-500 font-medium mt-1">
              Sign in to your PoseFit account
            </p>
          </div>

          {/* LOGIN FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* EMAIL */}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                Email Address
              </label>

              <input
                type="email"
                name="email"
                required
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }));
                }}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 transition-all bg-stone-50/50 focus:bg-white"
              />
            </div>

            {/* PASSWORD */}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }));
                  }}
                  className="w-full px-4 pr-12 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 transition-all bg-stone-50/50 focus:bg-white"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                      <path d="M9.88 5.09A9.77 9.77 0 0 1 12 4.86c5 0 8.27 4.17 9.5 6.14a1.77 1.77 0 0 1 0 1.99 16.2 16.2 0 0 1-3.1 3.45" />
                      <path d="M6.61 6.61A16.5 16.5 0 0 0 2.5 11a1.77 1.77 0 0 0 0 1.99C3.73 14.96 7 19.14 12 19.14a9.8 9.8 0 0 0 3.13-.51" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <path d="M2.5 12s3.27-7 9.5-7 9.5 7 9.5 7-3.27 7-9.5 7-9.5-7-9.5-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* FORGOT PASSWORD */}

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                Forgot Password?
              </Link>
            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm shadow-md hover:opacity-95 active:scale-95 disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* REGISTER */}

          <div className="mt-8 text-center text-xs font-bold text-stone-600">
            Don't have an account?{" "}
            <Link
              to="/user/register"
              state={location.state}
              className="text-emerald-600 hover:text-emerald-700 underline transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}