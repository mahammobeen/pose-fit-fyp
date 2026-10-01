import { useState, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { z } from "zod";
import { httpClient } from "../../lib/http";
import { AlertTriangle, Check } from "lucide-react";
import posefit_logo from "../../assets/posefit_logo.png";

const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters.")
    .max(50, "First name must not exceed 50 characters.")
    .regex(
      /^[A-Za-z][A-Za-z\s'.-]*$/,
      "First name contains invalid characters.",
    ),

  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters.")
    .max(50, "Last name must not exceed 50 characters.")
    .regex(
      /^[A-Za-z][A-Za-z\s'.-]*$/,
      "Last name contains invalid characters.",
    ),

  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(254, "Email address is too long.")
    .email("Please enter a valid email address."),

  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Password must be at least 8 characters.")
    .max(64, "Password must not exceed 64 characters.")
    .refine((value) => !/\s/.test(value), {
      message: "Password must not contain spaces.",
    })
    .refine((value) => /[a-z]/.test(value), {
      message: "Password must contain a lowercase letter.",
    })
    .refine((value) => /[A-Z]/.test(value), {
      message: "Password must contain an uppercase letter.",
    })
    .refine((value) => /[0-9]/.test(value), {
      message: "Password must contain a number.",
    })
    .refine((value) => /[^A-Za-z0-9]/.test(value), {
      message: "Password must contain a special character.",
    }),
});

const verificationSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Please enter the 6-digit verification code.")
    .regex(/^\d{6}$/, "Please enter the 6-digit verification code."),
});

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
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    const validation = registerSchema.safeParse(form);

    if (!validation.success) {
      showToast("error", validation.error.issues[0].message);
      return;
    }

    try {
      setLoading(true);

      const { firstName, lastName, email, password } = validation.data;

      const res = await httpClient.post("/auth/register", {
        firstName,
        lastName,
        email: email.toLowerCase(),
        password,
        role: "USER",
      });

      if (!res.data?.success) {
        showToast(
          "error",
          res.data?.message || "Registration failed. Please try again.",
        );
        return;
      }

      if (!res.data?.userId) {
        showToast(
          "error",
          "Registration succeeded, but verification session could not be created.",
        );
        return;
      }

      setUserId(res.data.userId);
      setStep(2);

      showToast(
        "success",
        res.data.message ||
          "Registration successful. Verification code sent to your email.",
      );
    } catch (err) {
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

  const handleVerifySubmit = async (e) => {
    e.preventDefault();

    const validation = verificationSchema.safeParse({ code });

    if (!validation.success) {
      showToast("error", validation.error.issues[0].message);
      return;
    }

    if (!userId) {
      showToast(
        "error",
        "Registration session expired. Please register again.",
      );
      setStep(1);
      setCode("");
      return;
    }

    try {
      setLoading(true);

      const res = await httpClient.post("/auth/verify-email", {
        userId,
        code: validation.data.code,
      });

      if (!res.data?.success) {
        showToast(
          "error",
          res.data?.message || "Verification failed. Please check the code.",
        );
        return;
      }

      showToast(
        "success",
        "Email verified successfully. Please login to continue.",
      );

      setTimeout(() => {
        navigate("/user/login", {
          replace: true,
          state: {
            email: form.email.trim().toLowerCase(),
            from: location.state?.from,
          },
        });
      }, 1200);
    } catch (err) {
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

  const handleBack = () => {
    if (loading) return;

    setStep(1);
    setCode("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8 font-sans">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-light/50 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent-blue/60 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-orange/20 blur-3xl" />

      {toast && (
        <div
          className={`fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-card border px-5 py-4 text-sm font-medium shadow-card-hover ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-brand-light bg-brand-light/60 text-brand-dark"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          ) : (
            <Check className="h-5 w-5 shrink-0" />
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

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-card border border-brand-light/70 bg-surface/80 p-8 shadow-card-hover backdrop-blur-xl sm:p-10">
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

          {step === 1 ? (
            <form
              onSubmit={handleRegisterSubmit}
              className="space-y-5"
              autoComplete="on"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                    minLength={8}
                    maxLength={64}
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        password: e.target.value.slice(0, 64),
                      }))
                    }
                    disabled={loading}
                    className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 pr-12 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                  />

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
                  Password must be 8 to 64 characters with uppercase, lowercase,
                  number, and special character.
                </p>
              </div>

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
            <form onSubmit={handleVerifySubmit} className="space-y-5">
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
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={loading}
                  className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3.5 text-center text-lg font-bold tracking-[0.35em] text-gray-800 outline-none transition-all placeholder:tracking-normal placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="mt-2 text-center text-xs text-gray-400">
                  Check your email for the 6-digit verification code.
                </p>
              </div>

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
                  "Verify Email & Continue"
                )}
              </button>

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

        <p className="mt-5 text-center text-xs text-gray-400">
          Your fitness journey starts with PoseFit.
        </p>
      </div>
    </div>
  );
}