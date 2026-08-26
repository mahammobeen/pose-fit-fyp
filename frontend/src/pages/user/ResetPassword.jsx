import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // =====================================================
  // CHECK RESET LINK
  // =====================================================

  useEffect(() => {
    // Agar URL mein email nahi hai
    // to page show nahi hoga
    if (!email || !email.trim()) {
      navigate("/user/login", {
        replace: true,
      });
    }
  }, [email, navigate]);

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    // =====================================================
    // EMAIL
    // =====================================================

    if (!cleanEmail) {
      return;
    }

    // =====================================================
    // PASSWORD
    // =====================================================

    if (!cleanPassword) {
      toast.error("Password is required.");
      return;
    }

    if (cleanPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    // =====================================================
    // CONFIRM PASSWORD
    // =====================================================

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
      // =====================================================
      // RESET PASSWORD
      // =====================================================

      const { data } = await httpClient.put(
        `/auth/reset-password/${encodeURIComponent(cleanEmail)}`,
        {
          password: cleanPassword,
        },
      );

      // =====================================================
      // SUCCESS
      // =====================================================

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
      } else if (error?.message === "Network Error") {
        errorMessage = "Unable to connect to the server. Please try again.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // IMPORTANT
  // =====================================================
  // Jab email nahi hai to kuch render nahi hoga.
  // useEffect user ko login par redirect karega.

  if (!email || !email.trim()) {
    return null;
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        {/* HEADING */}

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-stone-800">Reset Password</h1>

          <p className="text-sm text-stone-500 mt-2">
            Create a new password for your account.
          </p>
        </div>

        {/* EMAIL */}

        <div className="mb-5">
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Email Address
          </label>

          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-stone-100 text-stone-500 cursor-not-allowed outline-none"
          />
        </div>

        {/* FORM */}

        <form onSubmit={handleSubmit}>
          {/* NEW PASSWORD */}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              New Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-16 rounded-xl border border-stone-300 text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500 hover:text-emerald-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <p className="text-xs text-stone-400 mt-2">
              Password must be at least 6 characters.
            </p>
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="mb-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Confirm Password
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-16 rounded-xl border border-stone-300 text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500 hover:text-emerald-600"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {/* LOGIN */}

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

export default ResetPassword;
