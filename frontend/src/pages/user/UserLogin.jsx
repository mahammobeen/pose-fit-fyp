import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { AlertTriangle } from "lucide-react";
import posefit_logo from "../../assets/posefit_logo.png";

export default function UserLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });

    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      setToast(null);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      showToast("error", "Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await httpClient.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response?.data;

      if (!data?.success) {
        throw new Error(
          data?.message || data?.error || "Login failed. Please try again.",
        );
      }

      const token = data?.token;
      const user = data?.user;

      if (!token || !user) {
        throw new Error("Invalid login response from server.");
      }

      const userId = user?._id || user?.id || user?.userId;

      if (!userId) {
        throw new Error("User information is missing.");
      }

      const role = String(user?.role || "USER").toUpperCase();

      const validRoles = ["USER", "ADMIN", "PROFESSIONAL"];

      if (!validRoles.includes(role)) {
        throw new Error("Invalid user role.");
      }

      // USER verification check
      if (role === "USER" && user?.isVerified === false) {
        throw new Error(
          "Your account is not verified. Please verify your email first.",
        );
      }

      // Normalize user data before storing
      const normalizedUser = {
        ...user,
        _id: userId,
        id: userId,
        role,
      };

      localStorage.setItem("pose-fit", token);
      localStorage.setItem("pose-fit-user", JSON.stringify(normalizedUser));

      showToast("success", "Login successful! Redirecting...");

      setTimeout(() => {
        // ADMIN
        if (role === "ADMIN") {
          navigate("/admin/dashboard");
          return;
        }

        // PROFESSIONAL
        if (role === "PROFESSIONAL") {
          const professionalStatus = String(
            user?.professionalStatus || "",
          ).toLowerCase();

          const incompleteStatuses = [
            "",
            "incomplete",
            "invited",
            "pending_verification",
            "rejected",
          ];

          if (incompleteStatuses.includes(professionalStatus)) {
            navigate("/professional/profile/complete");
          } else if (professionalStatus === "approved") {
            navigate("/professional/dashboard");
          } else {
            navigate("/professional/profile/complete");
          }

          return;
        }

        // USER
        const fromPath = location.state?.from?.pathname || "/user/dashboard";

        navigate(fromPath);
      }, 700);
    } catch (error) {
      console.error("Login error:", error);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong. Please try again.";

      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8 font-sans">
      {/* Background Decorations */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-light/50 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent-blue/60 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-orange/20 blur-3xl" />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-card border px-5 py-4 text-sm font-medium shadow-card-hover ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-brand-light bg-brand-light/60 text-brand-dark"
          }`}
        >
          {toast.type === "error" && (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}

          <span>{toast.message}</span>
        </div>
      )}

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-card border border-brand-light/70 bg-surface/80 p-8 shadow-card-hover backdrop-blur-xl sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Link
              to="/"
              className="flex h-16 w-16 items-center justify-center rounded-card bg-white/70 p-2 shadow-card transition-transform duration-300 hover:-translate-y-1"
            >
              <img
                src={posefit_logo}
                alt="PoseFit Logo"
                className="h-full w-full object-contain"
              />
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Login to continue to PoseFit
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 pr-12 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-brand-dark disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-brand-dark transition-colors hover:text-brand"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-btn bg-gray-800 px-6 py-3.5 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Signup */}
          <div className="mt-7 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/user/register"
              className="font-bold text-brand-dark transition-colors hover:text-brand"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Bottom Text */}
        <p className="mt-5 text-center text-xs text-gray-400">
          Your fitness journey starts with PoseFit.
        </p>
      </div>
    </div>
  );
}