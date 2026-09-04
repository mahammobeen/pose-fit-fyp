import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { IconAlertTriangle, IconCheck } from "../../components/admin/Icons";
import posefit_logo from "../../assets/posefit_logo.png";

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

  const [showPassword, setShowPassword] = useState(false);

  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);

  // TOAST
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({
      type,
      message,
    });

    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      setToast(null);
    };
  }, []);

  // INPUT CHANGE
  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // REGISTER
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      showToast("error", "All fields are required.");
      return;
    }

    if (form.password.length < 6) {
      showToast("error", "Password must be at least 6 characters.");
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
          "error",
          res.data?.message || "Registration failed. Please try again.",
        );
        return;
      }

      // SAVE USER ID FOR VERIFICATION
      setUserId(res.data.userId);

      showToast(
        "success",
        res.data.message ||
          "Registration successful. Verification code sent to your email.",
      );

      setStep(2);
    } catch (err) {
      console.error("Registration error:", err);

      showToast(
        "error",
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Registration failed. Please verify your details.",
      );
    } finally {
      setLoading(false);
    }
  };

  // VERIFY EMAIL
  const handleVerifySubmit = async (e) => {
    e.preventDefault();

    const trimmedCode = code.trim();

    if (!userId) {
      showToast(
        "error",
        "Registration session expired. Please register again.",
      );

      setStep(1);
      return;
    }

    if (!trimmedCode) {
      showToast("error", "Verification code is required.");
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      showToast("error", "Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      // VERIFY EMAIL
      const verifyRes = await httpClient.post("/auth/verify-email", {
        userId,
        code: trimmedCode,
      });

      if (!verifyRes.data?.success) {
        showToast(
          "error",
          verifyRes.data?.message ||
            "Verification failed. Please check the code.",
        );
        return;
      }

      showToast("success", "Email verified successfully. Logging you in...");

      // AUTO LOGIN
      const loginEmail = form.email.trim().toLowerCase();

      const loginRes = await httpClient.post("/auth/login", {
        email: loginEmail,
        password: form.password,
      });

      const { success, token, user } = loginRes.data;

      // LOGIN RESPONSE VALIDATION
      if (!success || !token || !user) {
        showToast(
          "error",
          "Email verified successfully, but automatic login failed. Please login manually.",
        );

        setTimeout(() => {
          navigate("/user/login", {
            state: {
              from: location.state?.from,
            },
          });
        }, 1500);

        return;
      }

      // ROLE CHECK
      if (user.role !== "USER") {
        showToast(
          "error",
          "Invalid account role. Please use the appropriate portal.",
        );
        return;
      }

      // NORMALIZE USER
      const normalizedUser = {
        ...user,
        _id: user._id || user.id || user.userId,
      };

      const userIdFromResponse = user?._id || user?.id || user?.userId;

      if (!userIdFromResponse) {
        showToast("error", "User ID was not received from server.");
        return;
      }

      // CLEAR OLD LOGIN DATA
      localStorage.removeItem("pose-fit");
      localStorage.removeItem("pose-fit-user");

      // SAVE AUTH DATA
      localStorage.setItem("pose-fit", token);

      localStorage.setItem("pose-fit-user", JSON.stringify(normalizedUser));

      // REMEMBER EMAIL ONLY
      localStorage.setItem("pose-fit-email", loginEmail);

      // DEBUG
      console.log("REGISTER LOGIN RESPONSE:", loginRes.data);

      console.log("SAVED TOKEN:", token);

      console.log("SAVED USER:", normalizedUser);

      console.log("SAVED USER ID:", normalizedUser._id);

      // REDIRECT
      const from = location.state?.from?.pathname || "/user/dashboard";

      navigate(from, {
        replace: true,
      });
    } catch (err) {
      console.error("Verification/Login error:", err);

      showToast(
        "error",
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Verification failed. Please check the code and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // BACK TO REGISTER
  const handleBack = () => {
    setStep(1);
    setCode("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8 font-sans">
      {/* ================= BACKGROUND DECORATIONS ================= */}

      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-light/50 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent-blue/60 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-orange/20 blur-3xl" />

      {/* ================= TOAST ================= */}

      {toast && (
        <div
          className={`fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-card border px-5 py-4 text-sm font-medium shadow-card-hover ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-brand-light bg-brand-light/60 text-brand-dark"
          }`}
        >
          {toast.type === "error" ? (
            <IconAlertTriangle className="h-5 w-5 shrink-0" />
          ) : (
            <IconCheck className="h-5 w-5 shrink-0" />
          )}

          <span>{toast.message}</span>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 text-current opacity-60 transition-opacity hover:opacity-100"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= REGISTER CARD ================= */}

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-card border border-brand-light/70 bg-surface/80 p-8 shadow-card-hover backdrop-blur-xl sm:p-10">
          {/* ================= LOGO ================= */}

          <div className="mb-7 flex justify-center">
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

          {/* ================= HEADING ================= */}

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">
              {step === 1 ? "Create Account" : "Verify Your Email"}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {step === 1
                ? "Create your account to start your PoseFit journey"
                : "Enter the verification code sent to your email"}
            </p>
          </div>

          {/* ================= STEP 1 ================= */}

          {step === 1 ? (
            <form
              onSubmit={handleRegisterSubmit}
              className="space-y-5"
              autoComplete="on"
            >
              {/* FIRST + LAST NAME */}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* FIRST NAME */}

                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    First Name
                  </label>

                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    required
                    autoComplete="given-name"
                    placeholder="Enter first name"
                    value={form.firstName}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                {/* LAST NAME */}

                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Last Name
                  </label>

                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    required
                    autoComplete="family-name"
                    placeholder="Enter last name"
                    value={form.lastName}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

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
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* PASSWORD */}

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
                    name="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 pr-12 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {/* SHOW PASSWORD */}

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-brand-dark disabled:cursor-not-allowed"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
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

              {/* REGISTER BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-btn bg-gray-800 px-6 py-3.5 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing up...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          ) : (
            /* ================= STEP 2 ================= */

            <form onSubmit={handleVerifySubmit} className="space-y-5">
              {/* VERIFICATION CODE */}

              <div>
                <label
                  htmlFor="verificationCode"
                  className="mb-2 block text-center text-sm font-semibold text-gray-700"
                >
                  Verification Code
                </label>

                <input
                  id="verificationCode"
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
                  disabled={loading}
                  className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 text-center text-lg font-bold tracking-[0.35em] text-gray-800 outline-none transition-all placeholder:tracking-normal placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="mt-2 text-center text-xs text-gray-400">
                  Check your email for the 6-digit verification code.
                </p>
              </div>

              {/* VERIFY BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-btn bg-gray-800 px-6 py-3.5 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Verifying...
                  </span>
                ) : (
                  "Verify Code & Log In"
                )}
              </button>

              {/* BACK */}

              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-full text-sm font-semibold text-gray-500 transition-colors hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Back to Registration
              </button>
            </form>
          )}

          {/* ================= LOGIN LINK ================= */}

          <div className="mt-7 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/user/login"
              state={location.state}
              className="font-bold text-brand-dark transition-colors hover:text-brand"
            >
              Login
            </Link>
          </div>
        </div>

        {/* ================= BOTTOM TEXT ================= */}

        <p className="mt-5 text-center text-xs text-gray-400">
          Your fitness journey starts with PoseFit.
        </p>
      </div>
    </div>
  );
}
