import { useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";
import {
  IconLock,
  IconUsers,
  IconCheckCircle,
  IconAlertTriangle,
} from "../../components/admin/Icons";

export default function AdminSettings() {
  const currentUser =
    getUser() || {
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
    setPassForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setPassError("");
    setPassSuccess("");
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();

    if (
      !passForm.currentPassword ||
      !passForm.newPassword ||
      !passForm.confirmPassword
    ) {
      setPassError("All password fields are required.");
      return;
    }

    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }

    if (passForm.newPassword.length < 6) {
      setPassError("New password must be at least 6 characters.");
      return;
    }

    if (passForm.newPassword === passForm.currentPassword) {
      setPassError(
        "New password must be different from the current password."
      );
      return;
    }

    setLoadingPass(true);
    setPassError("");
    setPassSuccess("");

    try {
      await httpClient.put("/admin/change-password", {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });

      setPassSuccess("Admin password updated successfully!");

      setPassForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showToast("Password updated successfully!");
    } catch (err) {
      setPassError(
        err?.response?.data?.message || "Failed to change password."
      );
    } finally {
      setLoadingPass(false);
    }
  };

  const fullName =
    `${currentUser.firstName || "Admin"} ${
      currentUser.lastName || "User"
    }`.trim();

  const initials = `${currentUser.firstName?.[0] || "A"}${
    currentUser.lastName?.[0] || ""
  }`.toUpperCase();

  return (
    <AdminLayout>
      <div
        className="min-h-screen pb-16"
        style={{ background: "#f5f7f2" }}
      >
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border ${
              toast.type === "error"
                ? "bg-rose-500 border-rose-600"
                : "bg-emerald-600 border-emerald-700"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Account Settings
          </span>

          <div className="flex items-end justify-between gap-4 mt-3">
            <div>
              <h1 className="text-3xl font-black text-stone-800 tracking-tight">
                Admin Settings
              </h1>

              <p className="text-stone-500 font-medium text-sm mt-1">
                Manage your administrator account and security.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 max-w-5xl space-y-6">
          {/* Profile Card */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Profile Header */}
            <div className="relative overflow-hidden px-7 py-7">
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%, #f0fdf4 100%)",
                }}
              />

              <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981, #047857)",
                  }}
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-stone-800">
                      {fullName}
                    </h2>

                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  <p className="text-sm text-stone-500 font-medium mt-1">
                    {currentUser.email}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                      Role
                    </span>

                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-700 bg-white border border-stone-200 px-2.5 py-1 rounded-lg">
                      Administrator
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="px-7 pb-7">
              <div className="border-t border-stone-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <IconUsers className="w-4 h-4 text-emerald-700" />

                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
                    Account Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                      First Name
                    </p>

                    <p className="text-sm font-bold text-stone-800 mt-1.5 truncate">
                      {currentUser.firstName || "Admin"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                      Last Name
                    </p>

                    <p className="text-sm font-bold text-stone-800 mt-1.5 truncate">
                      {currentUser.lastName || "User"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                      Account Role
                    </p>

                    <p className="text-sm font-bold text-stone-800 mt-1.5">
                      Administrator
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                    Email Address
                  </p>

                  <p className="text-sm font-bold text-stone-800 mt-1.5 break-all">
                    {currentUser.email}
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-2 text-[11px] text-stone-400 font-medium">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0" />

                  <p>
                    Administrator profile details are controlled by the
                    system and cannot be edited from this page.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Password Card */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-7 py-6 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <IconLock className="w-5 h-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-stone-800">
                    Password & Security
                  </h2>

                  <p className="text-xs text-stone-400 font-medium mt-0.5">
                    Keep your administrator account secure by updating your
                    password regularly.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-7">
              <div className="max-w-xl">
                {passError && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <IconAlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{passError}</span>
                  </div>
                )}

                {passSuccess && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <IconCheckCircle className="w-4 h-4 shrink-0" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePassSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                      Current Password
                    </label>

                    <input
                      name="currentPassword"
                      type="password"
                      value={passForm.currentPassword}
                      onChange={handlePassChange}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 font-medium transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        New Password
                      </label>

                      <input
                        name="newPassword"
                        type="password"
                        value={passForm.newPassword}
                        onChange={handlePassChange}
                        placeholder="Minimum 6 characters"
                        autoComplete="new-password"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 font-medium transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        Confirm Password
                      </label>

                      <input
                        name="confirmPassword"
                        type="password"
                        value={passForm.confirmPassword}
                        onChange={handlePassChange}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <p className="text-[11px] text-stone-400 font-medium">
                      Password must contain at least 6 characters.
                    </p>

                    <button
                      type="submit"
                      disabled={loadingPass}
                      className="px-6 py-3 rounded-xl text-white font-bold text-sm shadow-sm hover:opacity-90 disabled:opacity-60 transition-all shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #10b981, #059669)",
                      }}
                    >
                      {loadingPass
                        ? "Updating..."
                        : "Update Password"}
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
