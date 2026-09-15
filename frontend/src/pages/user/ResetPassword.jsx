import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";
import posefit_logo from "../../assets/posefit_logo.png";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !email.trim()) {
      navigate("/user/login", {
        replace: true,
      });
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanEmail) {
      return;
    }

    if (!cleanPassword) {
      toast.error("Password is required.");
      return;
    }

    if (cleanPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (!cleanConfirmPassword) {
      toast.error("Please confirm your password.");
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {

      const { data } = await httpClient.put(
        `/auth/reset-password/${encodeURIComponent(cleanEmail)}`,
        {
          password: cleanPassword,
        },
      );

      toast.success(data?.message || "Password reset successfully.");

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/user/login", {
          replace: true,
        });
      }, 1000);
    } catch (error) {
      console.error("Reset password error:", error);

      let errorMessage = "Failed to reset password. Please try again.";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message === "Network Error") {
        errorMessage = "Unable to connect to the server. Please try again.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!email || !email.trim()) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8 font-sans">

      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-light/50 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent-blue/60 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-orange/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-card border border-brand-light/70 bg-surface/80 p-8 shadow-card-hover backdrop-blur-xl sm:p-10">

          <div className="mb-7 flex justify-center">
            <Link className="flex h-16 w-16 items-center justify-center rounded-card bg-white/70 p-2 shadow-card transition-transform duration-300 hover:-translate-y-1">
              <img
                src={posefit_logo}
                alt="PoseFit Logo"
                className="h-full w-full object-contain"
              />
            </Link>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">
              Reset Password
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Create a new password for your PoseFit account.
            </p>
          </div>

          <div className="mb-5">
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
              disabled
              className="w-full cursor-not-allowed rounded-btn border border-gray-200 bg-gray-100 px-4 py-3.5 text-sm text-gray-500 outline-none"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                New Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
                  autoComplete="new-password"
                  className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 pr-12 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-brand-dark disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>

              <p className="mt-1.5 text-xs text-gray-400">
                Password must be at least 6 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Confirm Password
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                  autoComplete="new-password"
                  className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 pr-12 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-brand-dark disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-btn bg-gray-800 px-6 py-3.5 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Resetting...
                </span>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          <div className="mt-7 text-center text-sm text-gray-500">
            Remember your password?{" "}
            <Link
              to="/user/login"
              className="font-bold text-brand-dark transition-colors hover:text-brand"
            >
              Login
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          Your fitness journey starts with PoseFit.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
