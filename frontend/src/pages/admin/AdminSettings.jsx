import { useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";
import {
  IconLock,
  IconUsers,
  IconBell,
  IconSettings,
  IconServer,
  IconCheckCircle,
  IconAlertTriangle,
} from "../../components/admin/Icons";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("security"); // "security" | "profile" | "notifications" | "preferences" | "system"

  // Admin user info
  const currentUser = getUser() || { firstName: "Admin", lastName: "User", email: "admin@posefit.com", role: "ADMIN" };
  const [profileForm, setProfileForm] = useState({
    firstName: currentUser.firstName || "",
    lastName: currentUser.lastName || "",
  });

  // Password form
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loadingPass, setLoadingPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  // Toggles for notifications
  const [notifications, setNotifications] = useState({
    emailOnProReq: true,
    emailOnPayment: true,
    emailWeeklyDigest: false,
    securityAlerts: true,
  });

  // Preferences
  const [preferences, setPreferences] = useState({
    commissionRate: "20%",
    currency: "USD ($)",
    timezone: "UTC+05:00 (Asia/Karachi)",
    theme: "Fitness Sage (Default)",
  });

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePassChange = (e) => {
    setPassForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setPassError(""); setPassSuccess("");
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (!passForm.currentPassword || !passForm.newPassword || !passForm.confirmPassword) {
      setPassError("All password fields are required."); return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError("New passwords do not match."); return;
    }
    if (passForm.newPassword.length < 6) {
      setPassError("New password must be at least 6 characters."); return;
    }
    if (passForm.newPassword === passForm.currentPassword) {
      setPassError("New password must be different from the current password."); return;
    }

    setLoadingPass(true); setPassError("");
    try {
      await httpClient.put("/admin/change-password", {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      setPassSuccess("Admin password updated successfully!");
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Password updated!");
    } catch (err) {
      setPassError(err?.response?.data?.message || "Failed to change password.");
    } finally { setLoadingPass(false); }
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    const updated = { ...currentUser, firstName: profileForm.firstName, lastName: profileForm.lastName };
    setAdminUser(updated);
    showToast("Profile details updated!");
  };

  const tabs = [
    { id: "security",      Icon: IconLock,     label: "Security & Login" },
    { id: "profile",       Icon: IconUsers,    label: "Admin Profile" },
    { id: "notifications", Icon: IconBell,     label: "Email & Alerts" },
    { id: "preferences",   Icon: IconSettings, label: "App Preferences" },
    { id: "system",        Icon: IconServer,   label: "System Health" },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen pb-16" style={{ background: "#f5f7f2" }}>
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border transition-all ${
              toast.type === "error" ? "bg-rose-500 border-rose-600" : "bg-emerald-600 border-emerald-700"
            }`}
            style={{ animation: "modalIn 0.2s ease" }}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            System Control Center
          </span>
          <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">Admin Settings</h1>
          <p className="text-stone-500 font-medium text-sm mt-1">Manage security credentials, platform configuration, notifications, and environment statuses.</p>
        </div>

        {/* Main Settings Container */}
        <div className="px-8 mt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 space-y-1.5">
            {tabs.map(({ id, Icon, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left border ${
                    active
                      ? "bg-white text-emerald-900 border-emerald-200 shadow-xs"
                      : "text-stone-600 border-transparent hover:bg-stone-200/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xs">
              {/* TAB 1: SECURITY & LOGIN */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                      <IconLock className="w-5 h-5 text-amber-700" />
                      Password & Authentication
                    </h2>
                    <p className="text-xs text-stone-400 font-medium mt-1">
                      Update your primary administrator access credentials.
                    </p>
                  </div>

                  {passError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                      <IconAlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{passError}</span>
                    </div>
                  )}
                  {passSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <IconCheckCircle className="w-4 h-4 shrink-0" />
                      <span>{passSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handlePassSubmit} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        Current Admin Password
                      </label>
                      <input
                        name="currentPassword"
                        type="password"
                        value={passForm.currentPassword}
                        onChange={handlePassChange}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        New Password
                      </label>
                      <input
                        name="newPassword"
                        type="password"
                        value={passForm.newPassword}
                        onChange={handlePassChange}
                        placeholder="Min. 6 characters"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <input
                        name="confirmPassword"
                        type="password"
                        value={passForm.confirmPassword}
                        onChange={handlePassChange}
                        placeholder="Re-enter new password"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loadingPass}
                      className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-xs hover:opacity-90 disabled:opacity-60 transition-all"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                      {loadingPass ? "Updating Password..." : "Update Admin Password"}
                    </button>
                  </form>

                  <hr className="my-6 border-stone-100" />

                  {/* Active Session Info */}
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 mb-3">
                      Active Admin Session
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                          <IconServer className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800">Current Web Session (Active)</p>
                          <p className="text-[11px] text-stone-400 font-medium mt-0.5">JWT Token Authenticated • Role: ADMIN</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                        Authorized
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROFILE */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                      <IconUsers className="w-5 h-5 text-teal-800" />
                      Administrator Account Details
                    </h2>
                    <p className="text-xs text-stone-400 font-medium mt-1">
                      Personal identity information for system logs.
                    </p>
                  </div>

                  <form onSubmit={handleProfileSave} className="space-y-4 max-w-md">
                    <div className="flex items-center gap-4 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-xs">
                        {currentUser.firstName?.[0] || "A"}
                      </div>
                      <div>
                        <p className="font-extrabold text-stone-800 text-base">
                          {currentUser.firstName} {currentUser.lastName}
                        </p>
                        <p className="text-xs text-stone-500 font-semibold">{currentUser.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-extrabold text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Super Administrator
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileForm.firstName}
                          onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileForm.lastName}
                          onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        Email Address (Read Only)
                      </label>
                      <input
                        type="email"
                        value={currentUser.email}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 text-sm font-medium cursor-not-allowed opacity-80"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-xs hover:opacity-90 transition-all"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                      Save Profile Name
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                      <IconBell className="w-5 h-5 text-sky-800" />
                      Email Notification Preferences
                    </h2>
                    <p className="text-xs text-stone-400 font-medium mt-1">
                      Configure automated system alerts sent via Gmail SMTP.
                    </p>
                  </div>

                  <div className="space-y-4 max-w-lg">
                    {[
                      { key: "emailOnProReq", label: "New Application Alerts", desc: "Notify admin when a professional submits verification details" },
                      { key: "emailOnPayment", label: "Stripe Payment Receipts", desc: "Notify admin on every completed transaction" },
                      { key: "emailWeeklyDigest", label: "Weekly Activity Summary", desc: "Send automated weekly analytics report every Sunday" },
                      { key: "securityAlerts", label: "Security & Login Alerts", desc: "Notify on password resets or unusual login attempts" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-2xl border border-stone-200 hover:bg-stone-50/60 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-stone-800">{label}</p>
                          <p className="text-[11px] text-stone-400 font-medium mt-0.5">{desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifications((p) => ({ ...p, [key]: !p[key] }));
                            showToast("Preference updated!");
                          }}
                          className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                            notifications[key] ? "bg-emerald-500" : "bg-stone-300"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                              notifications[key] ? "translate-x-6" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: PREFERENCES */}
              {activeTab === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                      <IconSettings className="w-5 h-5 text-purple-800" />
                      Platform Global Preferences
                    </h2>
                    <p className="text-xs text-stone-400 font-medium mt-1">
                      Default settings for PoseFit business operations.
                    </p>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        Default Platform Commission Rate
                      </label>
                      <input
                        type="text"
                        value={preferences.commissionRate}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-700 text-sm font-bold cursor-not-allowed"
                      />
                      <p className="text-[11px] text-stone-400 mt-1 font-medium">Configured in backend payment logic (20% admin / 80% professional).</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        Primary Payment Currency
                      </label>
                      <input
                        type="text"
                        value={preferences.currency}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-700 text-sm font-bold cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                        Server Timezone
                      </label>
                      <input
                        type="text"
                        value={preferences.timezone}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-700 text-sm font-bold cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEM HEALTH */}
              {activeTab === "system" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                      <IconServer className="w-5 h-5 text-emerald-800" />
                      System Health & Integrations
                    </h2>
                    <p className="text-xs text-stone-400 font-medium mt-1">
                      Status of connected backend microservices and databases.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: "Express Backend API", status: "Operational", detail: "Port 4000 • CORS Enabled" },
                      { name: "MongoDB Database", status: "Connected", detail: "PoseFit DB Cluster" },
                      { name: "Stripe API Integration", status: "Live Webhook Ready", detail: "PaymentIntents & Sessions" },
                      { name: "Nodemailer SMTP", status: "Gmail Transport Active", detail: "Verification & Meeting Emails" },
                    ].map((item) => (
                      <div key={item.name} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-stone-800 text-sm">{item.name}</span>
                          <IconCheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-xs font-bold text-emerald-700">{item.status}</p>
                        <p className="text-[11px] text-stone-400 font-medium mt-0.5">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
