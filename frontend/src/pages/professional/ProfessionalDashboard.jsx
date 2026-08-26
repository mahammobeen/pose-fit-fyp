import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  IconCalendar,
  IconTrendingUp,
  IconDollarSign,
  IconStar,
  IconCheckCircle,
  IconAlertTriangle,
  IconLock,
  IconBuilding,
  IconChevronRight,
} from "../../components/admin/Icons";

export default function ProfessionalDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/professional/dashboard");
      setDashboardData(res.data?.dashboard || null);
    } catch {
      showToast("Failed to load dashboard metrics", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "return") {
      httpClient
        .get("/payment/stripe-connect/status")
        .then(() => {
          showToast("Stripe Connect account status refreshed successfully!");
          fetchDashboard();
        })
        .catch(() => {});
    }
  }, [fetchDashboard]);

  const handleConnectStripe = async () => {
    setActionLoading(true);
    try {
      const res = await httpClient.post("/payment/stripe-connect/onboard");
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to initiate Stripe Connect setup.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setActionLoading(true);
    try {
      const res = await httpClient.post("/payment/stripe-connect/dashboard-link");
      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to open Stripe Dashboard.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const pro = dashboardData?.professional;
  const metrics = dashboardData?.metrics;
  const stripe = dashboardData?.stripeStatus;
  const recentBookings = dashboardData?.recentBookings || [];

  return (
    <ProfessionalLayout>
      <div className="min-h-screen pb-16" style={{ background: "#f5f7f2" }}>
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
            Professional Overview
          </span>
          <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">
            Welcome back, {pro?.firstName || "Professional"}!
          </h1>
          <p className="text-stone-500 font-medium text-sm mt-1">
            Manage your sessions, track your 80% earnings, availability schedule, and payout account.
          </p>
        </div>

        {/* Verification Status Banner */}
        <div className="px-8 mb-6">
          {pro?.professionalStatus === "approved" || pro?.professionalStatus === "APPROVED" ? (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-3xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <IconCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-emerald-900 text-sm">Account Verified & Live</p>
                  <p className="text-emerald-700 text-xs font-medium mt-0.5">
                    Your professional profile is active and bookable by PoseFit clients.
                  </p>
                </div>
              </div>
              <StatusBadge status="approved" />
            </div>
          ) : pro?.professionalStatus === "rejected" || pro?.professionalStatus === "REJECTED" ? (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <p className="font-extrabold text-rose-900 text-sm">Application Rejection Notice</p>
                </div>
                <StatusBadge status="rejected" />
              </div>
              <p className="text-xs text-rose-800 font-semibold bg-white p-3 rounded-2xl border border-rose-200">
                <span className="font-extrabold">Reason:</span> {pro?.rejectionReason || "Application details require correction."}
              </p>
              <p className="text-xs text-rose-700 font-medium">
                You can update your credentials or bio in <Link to="/professional/profile" className="font-bold underline">Profile Settings</Link> to resubmit for review.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <IconCalendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-amber-900 text-sm">Pending Verification Review</p>
                  <p className="text-amber-800 text-xs font-medium mt-0.5">
                    Your profile details are currently being reviewed by PoseFit Admin.
                  </p>
                </div>
              </div>
              <StatusBadge status="pending_verification" />
            </div>
          )}
        </div>

        {/* Stripe Payout Connection Banner */}
        <div className="px-8 mb-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                <IconBuilding className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-stone-800 text-sm flex items-center gap-2">
                  Stripe Payout Account
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stripe?.payoutsEnabled ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                    {stripe?.payoutsEnabled ? "Connected & Enabled" : "Setup Required"}
                  </span>
                </p>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  {stripe?.payoutsEnabled
                    ? `Direct payouts active ${stripe?.maskedBank ? `(${stripe.maskedBank})` : ""}`
                    : "Connect your bank account via Stripe Connect to receive your 80% session payouts."}
                </p>
              </div>
            </div>

            <div>
              {stripe?.payoutsEnabled ? (
                <button
                  onClick={handleOpenStripeDashboard}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-xs"
                >
                  {actionLoading ? "Opening..." : "Manage Stripe Express Payouts"}
                </button>
              ) : (
                <button
                  onClick={handleConnectStripe}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl font-bold text-white text-xs shadow-xs hover:opacity-90 transition-all"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  {actionLoading ? "Connecting..." : "Connect Bank Account / Setup Payouts"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Metric Cards (4 Required Cards) */}
        <div className="px-8 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Upcoming Sessions */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2">
              <IconCalendar className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-stone-900">{loading ? "-" : metrics?.upcomingSessionsCount || 0}</p>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">Upcoming Sessions</p>
          </div>

          {/* 2. Total Sessions */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mb-2">
              <IconTrendingUp className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-stone-900">{loading ? "-" : metrics?.totalSessions || 0}</p>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">Total Sessions</p>
          </div>

          {/* 3. Earnings This Month (80% Share) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
              <IconDollarSign className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-emerald-800">
              ${loading ? "-" : metrics?.monthlyEarnings?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">Earnings This Month (80%)</p>
          </div>

          {/* 4. Average Rating */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <IconStar className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-stone-900">
              {metrics?.ratingCount > 0 ? (
                <span>⭐ {metrics?.averageRating?.toFixed(1)}</span>
              ) : (
                <span className="text-amber-700 font-extrabold">New</span>
              )}
            </p>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">
              {metrics?.ratingCount > 0 ? `${metrics.ratingCount} Ratings` : "Rating Summary"}
            </p>
          </div>
        </div>

        {/* Recent / Upcoming Bookings Table */}
        <div className="px-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-stone-800">Recent Session Bookings</h2>
            <Link to="/professional/bookings" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
              View All Bookings <IconChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="text-center py-12 text-stone-400 font-medium">
                No recent session bookings found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {["Client", "Session Fee", "Pro Share (80%)", "Status", "Date"].map((h) => (
                        <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {recentBookings.map((b) => (
                      <tr key={b._id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-stone-800 whitespace-nowrap">
                            {b.user ? `${b.user.firstName} ${b.user.lastName}` : "Client"}
                          </p>
                          <p className="text-xs text-stone-400 font-medium">{b.user?.email}</p>
                        </td>
                        <td className="px-5 py-4 font-bold text-stone-800 whitespace-nowrap">${b.amount?.toFixed(2)}</td>
                        <td className="px-5 py-4 font-black text-emerald-700 whitespace-nowrap">${b.professionalAmount?.toFixed(2)}</td>
                        <td className="px-5 py-4 whitespace-nowrap"><StatusBadge status={b.status} /></td>
                        <td className="px-5 py-4 text-xs font-medium text-stone-500 whitespace-nowrap">
                          {new Date(b.paidAt || b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfessionalLayout>
  );
}
