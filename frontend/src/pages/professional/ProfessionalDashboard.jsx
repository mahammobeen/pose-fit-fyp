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
      showToast(
        err?.response?.data?.message ||
          "Failed to initiate Stripe Connect setup.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setActionLoading(true);

    try {
      const res = await httpClient.post(
        "/payment/stripe-connect/dashboard-link",
      );

      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to open Stripe Dashboard.",
        "error",
      );
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
      <div className="min-h-screen bg-transparent pb-16 font-sans">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed right-5 top-5 z-50 rounded-2xl border px-5 py-3 text-sm font-bold text-white shadow-card-hover transition-all ${
              toast.type === "error"
                ? "border-rose-600 bg-rose-500"
                : "border-brand-dark bg-brand-dark"
            }`}
            style={{ animation: "modalIn 0.2s ease" }}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <span className="inline-flex rounded-full border border-brand-light/70 bg-brand-light/40 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
            Professional Overview
          </span>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
            Welcome back, {pro?.firstName || "Professional"}!
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-500">
            Manage your sessions, track your 80% earnings, availability
            schedule, and payout account.
          </p>
        </div>

        {/* Verification Status Banner */}
        <div className="mb-6 px-4 sm:px-6 lg:px-8">
          {pro?.professionalStatus === "approved" ||
          pro?.professionalStatus === "APPROVED" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-light/70 bg-brand-light/25 p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light/60 text-brand-dark">
                  <IconCheckCircle className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-extrabold text-brand-dark">
                    Account Verified & Live
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-gray-600">
                    Your professional profile is active and bookable by PoseFit
                    clients.
                  </p>
                </div>
              </div>

              <StatusBadge status="approved" />
            </div>
          ) : pro?.professionalStatus === "rejected" ||
            pro?.professionalStatus === "REJECTED" ? (
            <div className="space-y-2 rounded-card border border-rose-200 bg-rose-50 p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />

                  <p className="text-sm font-extrabold text-rose-900">
                    Application Rejection Notice
                  </p>
                </div>

                <StatusBadge status="rejected" />
              </div>

              <p className="rounded-2xl border border-rose-200 bg-white p-3 text-xs font-semibold text-rose-800">
                <span className="font-extrabold">Reason:</span>{" "}
                {pro?.rejectionReason ||
                  "Application details require correction."}
              </p>

              <p className="text-xs font-medium text-rose-700">
                You can update your credentials or bio in{" "}
                <Link
                  to="/professional/profile"
                  className="font-bold underline"
                >
                  Profile Settings
                </Link>{" "}
                to resubmit for review.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-amber-200 bg-amber-50 p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <IconCalendar className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-extrabold text-amber-900">
                    Pending Verification Review
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-amber-800">
                    Your profile details are currently being reviewed by PoseFit
                    Admin.
                  </p>
                </div>
              </div>

              <StatusBadge status="pending_verification" />
            </div>
          )}
        </div>

        {/* Stripe Payout Connection Banner */}
        <div className="mb-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-brand-light/50 bg-surface/80 p-5 shadow-card backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent-blue bg-accent-blue/50 text-sky-700">
                <IconBuilding className="h-6 w-6" />
              </div>

              <div>
                <p className="flex items-center gap-2 text-sm font-extrabold text-gray-800">
                  Stripe Payout Account
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      stripe?.payoutsEnabled
                        ? "border-brand-light bg-brand-light/30 text-brand-dark"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {stripe?.payoutsEnabled
                      ? "Connected & Enabled"
                      : "Setup Required"}
                  </span>
                </p>

                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  {stripe?.payoutsEnabled
                    ? `Direct payouts active ${
                        stripe?.maskedBank ? `(${stripe.maskedBank})` : ""
                      }`
                    : "Connect your bank account via Stripe Connect to receive your 80% session payouts."}
                </p>
              </div>
            </div>

            <div>
              {stripe?.payoutsEnabled ? (
                <button
                  onClick={handleOpenStripeDashboard}
                  disabled={actionLoading}
                  className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading
                    ? "Opening..."
                    : "Manage Stripe Express Payouts"}
                </button>
              ) : (
                <button
                  onClick={handleConnectStripe}
                  disabled={actionLoading}
                  className="rounded-btn bg-gray-800 px-5 py-2.5 text-xs font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading
                    ? "Connecting..."
                    : "Connect Bank Account / Setup Payouts"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {/* Upcoming Sessions */}
          <div className="rounded-card border border-brand-light/50 bg-surface/80 p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-light/40 text-brand-dark">
              <IconCalendar className="h-5 w-5" />
            </div>

            <p className="text-2xl font-extrabold text-gray-800">
              {loading ? "-" : metrics?.upcomingSessionsCount || 0}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              Upcoming Sessions
            </p>
          </div>

          {/* Total Sessions */}
          <div className="rounded-card border border-brand-light/50 bg-surface/80 p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-blue/50 text-sky-700">
              <IconTrendingUp className="h-5 w-5" />
            </div>

            <p className="text-2xl font-extrabold text-gray-800">
              {loading ? "-" : metrics?.totalSessions || 0}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Sessions
            </p>
          </div>

          {/* Earnings This Month */}
          <div className="rounded-card border border-brand-light/50 bg-surface/80 p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-light/40 text-brand-dark">
              <IconDollarSign className="h-5 w-5" />
            </div>

            <p className="text-2xl font-extrabold text-brand-dark">
              ${loading ? "-" : metrics?.monthlyEarnings?.toFixed(2) || "0.00"}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              Earnings This Month (80%)
            </p>
          </div>

          {/* Average Rating */}
          <div className="rounded-card border border-brand-light/50 bg-surface/80 p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <IconStar className="h-5 w-5 fill-amber-400 text-amber-500" />
            </div>

            <p className="text-2xl font-extrabold text-gray-800">
              {metrics?.ratingCount > 0 ? (
                <span>⭐ {metrics?.averageRating?.toFixed(1)}</span>
              ) : (
                <span className="font-extrabold text-amber-700">New</span>
              )}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              {metrics?.ratingCount > 0
                ? `${metrics.ratingCount} Ratings`
                : "Rating Summary"}
            </p>
          </div>
        </div>

        {/* Recent / Upcoming Bookings */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-gray-800">
              Recent Session Bookings
            </h2>

            <Link
              to="/professional/bookings"
              className="flex items-center gap-1 text-xs font-bold text-brand-dark transition-colors hover:text-brand"
            >
              View All Bookings
              <IconChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand-dark" />
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="py-12 text-center font-medium text-gray-400">
                No recent session bookings found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-light/40 bg-brand-light/10">
                      {[
                        "Client",
                        "Session Fee",
                        "Pro Share (80%)",
                        "Status",
                        "Date",
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-brand-light/30">
                    {recentBookings.map((b) => (
                      <tr
                        key={b._id}
                        className="transition-colors hover:bg-brand-light/10"
                      >
                        {/* Client */}
                        <td className="px-5 py-4">
                          <p className="whitespace-nowrap font-bold text-gray-800">
                            {b.user
                              ? `${b.user.firstName} ${b.user.lastName}`
                              : "Client"}
                          </p>

                          <p className="text-xs font-medium text-gray-400">
                            {b.user?.email}
                          </p>
                        </td>

                        {/* Session Fee */}
                        <td className="whitespace-nowrap px-5 py-4 font-bold text-gray-800">
                          ${b.amount?.toFixed(2)}
                        </td>

                        {/* Professional Share */}
                        <td className="whitespace-nowrap px-5 py-4 font-extrabold text-brand-dark">
                          ${b.professionalAmount?.toFixed(2)}
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-5 py-4">
                          <StatusBadge status={b.status} />
                        </td>

                        {/* Date */}
                        <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-gray-500">
                          {new Date(b.paidAt || b.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
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
