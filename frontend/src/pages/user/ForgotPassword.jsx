import { useState } from "react";
import { Link } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";

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

      // Backend ka actual message user ko show hoga
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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-stone-800">
            Forgot Password?
          </h1>

          <p className="text-sm text-stone-500 mt-2">
            Enter your email address and we will send you a password reset link.
          </p>
        </div>

        {/* ===================================================
            SUCCESS MESSAGE
        =================================================== */}

        {emailSent && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-sm font-semibold text-emerald-700">
              Email sent successfully!
            </p>

            <p className="text-sm text-emerald-600 mt-1">
              Please check your email inbox for the password reset link. Also
              check your spam or junk folder.
            </p>
          </div>
        )}

        {/* ===================================================
            FORM
        =================================================== */}

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Email Address
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailSent(false);
            }}
            placeholder="Enter your email address"
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-stone-300 text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
          />

          {/* =================================================
              SUBMIT BUTTON
          ================================================= */}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {/* ===================================================
            LOGIN LINK
        =================================================== */}

        <p className="text-sm text-center text-stone-500 mt-5">
          Go back to{" "}
          <Link
            to="/user/login"
            className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
