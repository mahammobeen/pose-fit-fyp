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

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // =====================================================
  // TOAST
  // =====================================================

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

  // =====================================================
  // LOGIN
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email.trim() || !form.password) {
      showToast("Email and password are required.", "error");
      return;
    }

    try {
      setLoading(true);

      const res = await httpClient.post("/auth/login", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      console.log("LOGIN RESPONSE:", res.data);

      const { success, token, user } = res.data;

      // =================================================
      // VALIDATE RESPONSE
      // =================================================

      if (!success || !token || !user) {
        showToast("Invalid response from server.", "error");
        return;
      }

      // =================================================
      // USER ID CHECK
      // =================================================

      const userId = user?._id || user?.id || user?.userId;

      if (!userId) {
        console.error("User object does not contain an ID:", user);

        showToast("User ID was not received from server.", "error");
        return;
      }

      // =================================================
      // ROLE CHECK
      // =================================================

      if (user.role !== "USER") {
        showToast(
          "Access denied. Admin and Professional accounts must use their respective portal.",
          "error",
        );
        return;
      }

      // =================================================
      // EMAIL VERIFICATION
      // =================================================

      if (!user.isVerified) {
        showToast("Please verify your email before logging in.", "error");
        return;
      }

      // =================================================
      // NORMALIZE USER OBJECT
      // =================================================

      const normalizedUser = {
        ...user,
        _id: user._id || user.id || user.userId,
      };

      // =================================================
      // CLEAR OLD LOGIN DATA
      // =================================================

      localStorage.removeItem("pose-fit");
      localStorage.removeItem("pose-fit-user");

      // =================================================
      // SAVE NEW LOGIN DATA
      // =================================================

      localStorage.setItem("pose-fit", token);

      localStorage.setItem("pose-fit-user", JSON.stringify(normalizedUser));

      // =================================================
      // DEBUG
      // =================================================

      console.log("SAVED TOKEN:", token);
      console.log("SAVED USER:", normalizedUser);
      console.log("SAVED USER ID:", normalizedUser._id);

      // =================================================
      // SUCCESS TOAST
      // =================================================

      showToast("Login successful! Welcome to PoseFit.", "success");

      // =================================================
      // REDIRECT
      // =================================================

      const from = location.state?.from?.pathname || "/user/dashboard";

      setTimeout(() => {
        navigate(from, {
          replace: true,
        });
      }, 700);
    } catch (err) {
      console.error("Login error:", err);

      showToast(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Login failed. Please check your email and password.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 40%, #e0f2fe 100%)",
      }}
    >
      {/* =================================================
          BACKGROUND DECORATION
      ================================================= */}

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

      {/* =================================================
          TOAST
      ================================================= */}

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

      {/* =================================================
          LOGIN CARD
      ================================================= */}

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-stone-200/80 shadow-xl">
          {/* =================================================
              LOGO / HEADER
          ================================================= */}

          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-sm mb-4"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
            >
              P
            </div>

            <h1 className="text-2xl font-black text-stone-800 tracking-tight">
              PoseFit Login
            </h1>

            <p className="text-xs text-stone-500 font-medium mt-1">
              Sign in to your customer account
            </p>
          </div>

          {/* =================================================
              LOGIN FORM
          ================================================= */}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* EMAIL */}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                Email Address
              </label>

              <input
                type="email"
                required
                autoComplete="email"
                placeholder="customer@example.com"
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

              <input
                type="password"
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
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 transition-all bg-stone-50/50 focus:bg-white"
              />
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
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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

          {/* =================================================
              REGISTER
          ================================================= */}

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
