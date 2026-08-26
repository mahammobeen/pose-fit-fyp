import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { IconAlertTriangle, IconCheck } from "../../components/admin/Icons";

export default function UserRegister() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);

  // =====================================================
  // TOAST
  // =====================================================

  const [toast, setToast] = useState(null);

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
  // INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      showToast("All fields are required.", "error");
      return;
    }

    if (form.password.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    try {
      setLoading(true);

      const res = await httpClient.post("/auth/register", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "USER",
      });

      if (!res.data?.success) {
        showToast(
          res.data?.message || "Registration failed. Please try again.",
          "error",
        );
        return;
      }

      // =================================================
      // SAVE USER ID FOR VERIFICATION
      // =================================================

      setUserId(res.data.userId);

      showToast(
        res.data.message ||
          "Registration successful. Verification code sent to your email.",
        "success",
      );

      setStep(2);
    } catch (err) {
      console.error("Registration error:", err);

      showToast(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Registration failed. Please verify your details.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // VERIFY EMAIL
  // =====================================================

  const handleVerifySubmit = async (e) => {
    e.preventDefault();

    const trimmedCode = code.trim();

    // =================================================
    // VALIDATION
    // =================================================

    if (!userId) {
      showToast(
        "Registration session expired. Please register again.",
        "error",
      );

      setStep(1);
      return;
    }

    if (!trimmedCode) {
      showToast("Verification code is required.", "error");
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      showToast("Please enter the 6-digit verification code.", "error");
      return;
    }

    try {
      setLoading(true);

      // =================================================
      // VERIFY EMAIL
      // =================================================

      const verifyRes = await httpClient.post("/auth/verify-email", {
        userId,
        code: trimmedCode,
      });

      if (!verifyRes.data?.success) {
        showToast(
          verifyRes.data?.message ||
            "Verification failed. Please check the code.",
          "error",
        );
        return;
      }

      showToast("Email verified successfully. Logging you in...", "success");

      // =================================================
      // AUTO LOGIN
      // =================================================

      const loginRes = await httpClient.post("/auth/login", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      const { success, token, user } = loginRes.data;

      // =================================================
      // LOGIN RESPONSE VALIDATION
      // =================================================

      if (!success || !token || !user) {
        showToast(
          "Email verified successfully, but automatic login failed. Please login manually.",
          "error",
        );

        setTimeout(() => {
          navigate("/login", {
            state: {
              from: location.state?.from,
            },
          });
        }, 1500);

        return;
      }

      // =================================================
      // ROLE CHECK
      // =================================================

      if (user.role !== "USER") {
        showToast(
          "Invalid account role. Please use the appropriate portal.",
          "error",
        );
        return;
      }

      // =================================================
      // NORMALIZE USER
      // =================================================

      const normalizedUser = {
        ...user,
        _id: user._id || user.id || user.userId,
      };

      const userIdFromResponse = user?._id || user?.id || user?.userId;

      if (!userIdFromResponse) {
        showToast("User ID was not received from server.", "error");
        return;
      }

      // =================================================
      // CLEAR OLD LOGIN DATA
      // =================================================

      localStorage.removeItem("pose-fit");
      localStorage.removeItem("pose-fit-user");

      // =================================================
      // SAVE AUTH DATA
      // =================================================

      localStorage.setItem("pose-fit", token);

      localStorage.setItem("pose-fit-user", JSON.stringify(normalizedUser));

      // =================================================
      // DEBUG
      // =================================================

      console.log("REGISTER LOGIN RESPONSE:", loginRes.data);
      console.log("SAVED TOKEN:", token);
      console.log("SAVED USER:", normalizedUser);
      console.log("SAVED USER ID:", normalizedUser._id);

      // =================================================
      // REDIRECT
      // =================================================

      const from = location.state?.from?.pathname || "/user/dashboard";

      navigate(from, {
        replace: true,
      });
    } catch (err) {
      console.error("Verification/Login error:", err);

      showToast(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Verification failed. Please check the code and try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // BACK TO REGISTER
  // =====================================================

  const handleBack = () => {
    setStep(1);
    setCode("");
  };

  // =====================================================
  // TOAST ICON
  // =====================================================

  const ToastIcon = () => {
    if (toast?.type === "error") {
      return <IconAlertTriangle className="w-5 h-5 text-white shrink-0" />;
    }

    return <IconCheck className="w-5 h-5 text-white shrink-0" />;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 40%, #e0f2fe 100%)",
      }}
    >
      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] max-w-sm px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-bold border flex items-center gap-3 ${
            toast.type === "error"
              ? "bg-rose-500 border-rose-600"
              : "bg-emerald-600 border-emerald-700"
          }`}
        >
          <ToastIcon />

          <span className="leading-relaxed">{toast.msg}</span>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-white/80 hover:text-white text-lg leading-none"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

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

      {/* =====================================================
          REGISTER CARD
      ===================================================== */}

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-stone-200/80 shadow-xl">
          {/* =================================================
              HEADER
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
              PoseFit Sign Up
            </h1>

            <p className="text-xs text-stone-500 font-medium mt-1">
              {step === 1
                ? "Create your customer account to start booking"
                : "Verify your email to complete registration"}
            </p>
          </div>

          {/* =================================================
              STEP 1 - REGISTER
          ================================================= */}

          {step === 1 ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* First + Last Name */}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    First Name
                  </label>

                  <input
                    type="text"
                    name="firstName"
                    required
                    autoComplete="given-name"
                    placeholder="John"
                    value={form.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 transition-all bg-stone-50/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Last Name
                  </label>

                  <input
                    type="text"
                    name="lastName"
                    required
                    autoComplete="family-name"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 transition-all bg-stone-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Email */}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="john.doe@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 transition-all bg-stone-50/50 focus:bg-white"
                />
              </div>

              {/* Password */}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 transition-all bg-stone-50/50 focus:bg-white"
                />

                <p className="text-[11px] text-stone-400 mt-1.5">
                  Password must be at least 6 characters.
                </p>
              </div>

              {/* Register Button */}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm shadow-md hover:opacity-95 active:scale-95 disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                    <span>Signing up...</span>
                  </>
                ) : (
                  <span>Register Account</span>
                )}
              </button>
            </form>
          ) : (
            /* =================================================
               STEP 2 - VERIFY EMAIL
            ================================================= */

            <form onSubmit={handleVerifySubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2 text-center">
                  Enter 6-Digit Code
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);

                    setCode(value);
                  }}
                  className="w-full text-center px-4 py-3 rounded-2xl border border-stone-200 text-lg font-black tracking-widest outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 transition-all bg-stone-50/50 focus:bg-white"
                />

                <p className="text-center text-[11px] text-stone-400 mt-2">
                  Check your email for the verification code.
                </p>
              </div>

              {/* Verify Button */}

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

                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Code & Log In</span>
                )}
              </button>

              {/* Back */}

              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-full text-xs font-bold text-stone-500 hover:text-stone-700 disabled:opacity-50 transition-colors"
              >
                ← Back to Registration
              </button>
            </form>
          )}

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="mt-6 text-center text-xs font-bold text-stone-600">
            Already have an account?{" "}
            <Link
              to="/user/login"
              state={location.state}
              className="text-emerald-600 hover:text-emerald-700 underline transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
