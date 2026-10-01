import { useState } from "react";
import { z } from "zod";
import AdminLayout from "../../components/admin/AdminLayout";
import { httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";
import {
  Lock,
  Users,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const adminPasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required."),

    newPassword: z
      .string()
      .min(1, "New password is required.")
      .min(8, "New password must be at least 8 characters.")
      .max(64, "New password must not exceed 64 characters.")
      .refine((value) => !/\s/.test(value), {
        message: "New password must not contain spaces.",
      })
      .refine((value) => /[a-z]/.test(value), {
        message: "New password must contain a lowercase letter.",
      })
      .refine((value) => /[A-Z]/.test(value), {
        message: "New password must contain an uppercase letter.",
      })
      .refine((value) => /[0-9]/.test(value), {
        message: "New password must contain a number.",
      })
      .refine((value) => /[^A-Za-z0-9]/.test(value), {
        message: "New password must contain a special character.",
      }),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });

export default function AdminSettings() {
  const currentUser = getUser() || {
    firstName: "Admin",
    lastName: "User",
    email: "admin@posefit.com",
    role: "ADMIN",
  };

  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loadingPass, setLoadingPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handlePassChange = (e) => {
    const { name, value } = e.target;

    setPassForm((prev) => ({
      ...prev,
      [name]:
        name === "newPassword" || name === "confirmPassword"
          ? value.slice(0, 64)
          : value,
    }));

    setPassError("");
    setPassSuccess("");
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();

    const validation = adminPasswordSchema.safeParse(passForm);

    if (!validation.success) {
      setPassError(validation.error.issues[0].message);
      return;
    }

    const validatedData = validation.data;

    setLoadingPass(true);
    setPassError("");
    setPassSuccess("");

    try {
      const res = await httpClient.put("/admin/change-password", {
        currentPassword: validatedData.currentPassword,
        newPassword: validatedData.newPassword,
      });

      setPassSuccess(
        res.data?.message || "Admin password updated successfully!",
      );

      setPassForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showToast("Password updated successfully!");
    } catch (err) {
      setPassError(
        err?.response?.data?.message || "Failed to change password.",
      );
    } finally {
      setLoadingPass(false);
    }
  };

  const fullName = `${currentUser.firstName || "Admin"} ${
    currentUser.lastName || "User"
  }`.trim();

  const initials = `${currentUser.firstName?.[0] || "A"}${
    currentUser.lastName?.[0] || ""
  }`.toUpperCase();

  return (
    <AdminLayout>
      <div className="min-h-screen pb-16 bg-transparent font-sans">
        {toast && (
          <div
            className={`fixed right-5 top-5 z-50 rounded-2xl border px-5 py-3 text-sm font-bold text-white shadow-card-hover ${
              toast.type === "error"
                ? "border-rose-600 bg-rose-500"
                : "border-brand-dark bg-brand-dark"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <div className="px-4 pb-6 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <span className="inline-flex items-center rounded-full border border-brand-light/70 bg-brand-light/40 px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
            Account Settings
          </span>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
                Admin Settings
              </h1>

              <p className="mt-1 text-sm font-medium text-gray-500">
                Manage your administrator account and security.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl">
            <div className="relative overflow-hidden px-7 py-7">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-light/40 via-surface/80 to-accent-blue/20" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-card bg-brand text-2xl font-black text-white shadow-card">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-gray-800">
                      {fullName}
                    </h2>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-light/70 bg-brand-light/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-dark">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                      Active
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {currentUser.email}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                      Role
                    </span>

                    <span className="rounded-lg border border-gray-200 bg-white/70 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-700">
                      Administrator
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-7 pb-7">
              <div className="border-t border-brand-light/40 pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-dark" />

                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
                    Account Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-card border border-brand-light/40 bg-brand-light/10 px-4 py-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      First Name
                    </p>

                    <p className="mt-1.5 truncate text-sm font-bold text-gray-800">
                      {currentUser.firstName || "Admin"}
                    </p>
                  </div>

                  <div className="rounded-card border border-brand-light/40 bg-brand-light/10 px-4 py-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Last Name
                    </p>

                    <p className="mt-1.5 truncate text-sm font-bold text-gray-800">
                      {currentUser.lastName || "User"}
                    </p>
                  </div>

                  <div className="rounded-card border border-brand-light/40 bg-brand-light/10 px-4 py-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Account Role
                    </p>

                    <p className="mt-1.5 text-sm font-bold text-gray-800">
                      Administrator
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-card border border-brand-light/40 bg-brand-light/10 px-4 py-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Email Address
                  </p>

                  <p className="mt-1.5 break-all text-sm font-bold text-gray-800">
                    {currentUser.email}
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-2 text-[11px] font-medium text-gray-400">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />

                  <p>
                    Administrator profile details are controlled by the system
                    and cannot be edited from this page.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl">
            <div className="border-b border-brand-light/40 px-7 py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-orange/40 text-accent-orange-dark">
                  <Lock className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-gray-800">
                    Password & Security
                  </h2>

                  <p className="mt-0.5 text-xs font-medium text-gray-400">
                    Keep your administrator account secure by updating your
                    password regularly.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-7">
              <div className="max-w-xl">
                {passError && (
                  <div className="mb-5 flex items-center gap-2 rounded-card border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{passError}</span>
                  </div>
                )}

                {passSuccess && (
                  <div className="mb-5 flex items-center gap-2 rounded-card border border-brand-light/70 bg-brand-light/25 p-3.5 text-xs font-semibold text-brand-dark">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePassSubmit} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                      Current Password
                    </label>

                    <input
                      name="currentPassword"
                      type="password"
                      value={passForm.currentPassword}
                      onChange={handlePassChange}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                        New Password
                      </label>

                      <input
                        name="newPassword"
                        type="password"
                        value={passForm.newPassword}
                        onChange={handlePassChange}
                        maxLength={64}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                        Confirm Password
                      </label>

                      <input
                        name="confirmPassword"
                        type="password"
                        value={passForm.confirmPassword}
                        onChange={handlePassChange}
                        maxLength={64}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] font-medium text-gray-400">
                      Password must be 8–64 characters and include uppercase,
                      lowercase, number, and special character.
                    </p>

                    <button
                      type="submit"
                      disabled={loadingPass}
                      className="shrink-0 rounded-btn bg-gray-800 px-6 py-3 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {loadingPass ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
