import { useState } from "react";
import { Link } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";
import posefit_logo from "../../assets/posefit_logo.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // =========================================================
  // SUBMIT FORGOT PASSWORD
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    // Validation
    if (!cleanEmail) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);
    setEmailSent(false);

    try {
      const response = await httpClient.post("/auth/forgot-password", {
        email: cleanEmail,
      });

      console.log("Forgot password response:", response.data);

      setEmailSent(true);
      setEmail("");

      toast.success(
        response?.data?.message ||
          "Password reset link has been sent to your email.",
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      console.error("Status:", error?.response?.status);
      console.error("Backend error:", error?.response?.data);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to send reset email. Please try again.";

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8 font-sans">
      {/* =====================================================
          BACKGROUND DECORATIONS
      ===================================================== */}

      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-light/50 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent-blue/60 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-orange/20 blur-3xl" />

      {/* =====================================================
          FORGOT PASSWORD CARD
      ===================================================== */}

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-card border border-brand-light/70 bg-surface/80 p-8 shadow-card-hover backdrop-blur-xl sm:p-10">
          {/* =================================================
              LOGO
          ================================================= */}

          <div className="mb-7 flex justify-center">
            <Link className="flex h-16 w-16 items-center justify-center rounded-card bg-white/70 p-2 shadow-card transition-transform duration-300 hover:-translate-y-1">
              <img
                src={posefit_logo}
                alt="PoseFit Logo"
                className="h-full w-full object-contain"
              />
            </Link>
          </div>

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">
              Forgot Password?
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Enter your email address and we'll send you a password reset link.
            </p>
          </div>

          {/* =================================================
              SUCCESS MESSAGE
          ================================================= */}

          {emailSent && (
            <div className="mb-5 rounded-btn border border-brand-light bg-brand-light/30 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <span className="material-symbols-outlined text-[16px]">
                    check
                  </span>
                </div>

                <div>
                  <p className="text-sm font-bold text-brand-dark">
                    Email sent successfully!
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-brand-dark/80">
                    Please check your email inbox for the password reset link.
                    Also check your spam or junk folder.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              FORM
          ================================================= */}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* EMAIL */}

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailSent(false);
                }}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* =================================================
                SUBMIT BUTTON
            ================================================= */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-btn bg-gray-800 px-6 py-3.5 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[19px]">
                    mail
                  </span>
                  Send Reset Link
                </span>
              )}
            </button>
          </form>

          {/* =================================================
              LOGIN LINK
          ================================================= */}

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

        {/* ===================================================
            BOTTOM TEXT
        =================================================== */}

        <p className="mt-5 text-center text-xs text-gray-400">
          Your fitness journey starts with PoseFit.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
