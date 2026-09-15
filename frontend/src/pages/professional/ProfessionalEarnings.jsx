import { useState, useEffect, useCallback } from "react";
import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  DollarSign,
  Building2,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

export default function ProfessionalEarnings() {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });

    setTimeout(() => setToast(null), 3500);
  };

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);

      const res = await httpClient.get("/professional/earnings");

      setEarningsData(res.data || null);
    } catch {
      showToast("Failed to load earnings metrics", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

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

  const handleDelete = async (paymentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this earning record? This will only remove it from your earnings history.",
    );

    if (!confirmed) return;

    try {
      await httpClient.delete(`/payment/professional/payments/${paymentId}`);

      showToast("Earning record deleted successfully.");

      fetchEarnings();
    } catch (error) {
      console.error("Delete earning record error:", error);

      showToast(
        error?.response?.data?.message ||
          "Failed to delete earning record.",
        "error",
      );
    }
  };

  const metrics = earningsData?.earnings;
  const stripe = earningsData?.stripeStatus;
  const history = earningsData?.paymentHistory || [];

  const cards = [
    {
      label: "Total Earnings (80%)",
      value: `Rs. ${Number(metrics?.totalEarnings || 0).toLocaleString()}`,
      Icon: DollarSign,
      iconBg: "bg-brand-light/40",
      iconColor: "text-brand-dark",
      valueColor: "text-brand-dark",
    },
    {
      label: "Current Month",
      value: `Rs. ${Number(metrics?.currentMonthEarnings || 0).toLocaleString()}`,
      Icon: TrendingUp,
      iconBg: "bg-accent-blue/50",
      iconColor: "text-sky-700",
      valueColor: "text-gray-800",
    },
    {
      label: "Released to Connect",
      value: `Rs. ${Number(metrics?.releasedEarnings || 0).toLocaleString()}`,
      Icon: CheckCircle,
      iconBg: "bg-brand-light/40",
      iconColor: "text-brand-dark",
      valueColor: "text-brand-dark",
    },
  ];

  return (
    <ProfessionalLayout>
      <div className="min-h-screen bg-transparent pb-16 font-sans">

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

        <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <span className="inline-flex rounded-full border border-brand-light/70 bg-brand-light/40 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
            Financial Dashboard
          </span>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
            Earnings & Payouts
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-500">
            Track your 80% payout shares, Stripe Connect transfer statuses, and
            session payment history.
          </p>
        </div>

        <div className="mb-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-brand-light/50 bg-surface/80 p-5 shadow-card backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-light bg-brand-light/30 text-brand-dark">
                <Building2 className="h-6 w-6" />
              </div>

              <div>
                <p className="flex items-center gap-2 text-sm font-extrabold text-gray-800">
                  Stripe Express Payout Account
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      stripe?.payoutsEnabled
                        ? "border-brand-light bg-brand-light/30 text-brand-dark"
                        : stripe?.accountStatus === "active"
                          ? "border-brand-light bg-brand-light/30 text-brand-dark"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {stripe?.payoutsEnabled ||
                    stripe?.accountStatus === "active"
                      ? "Connected & Active"
                      : "Action Required"}
                  </span>
                </p>

                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  {stripe?.connected
                    ? `Account ID: ${stripe.stripeAccountId}${
                        stripe?.maskedBank ? ` • Bank: ${stripe.maskedBank}` : ""
                      }`
                    : "Connect your bank account via Stripe Express to receive direct payouts."}
                </p>
              </div>
            </div>

            {stripe?.connected && (
              <button
                onClick={handleOpenStripeDashboard}
                disabled={actionLoading}
                className="rounded-btn border border-gray-200 bg-white/70 px-4 py-2 text-xs font-bold text-gray-700 shadow-card transition-all hover:bg-brand-light/20 hover:text-brand-dark disabled:opacity-50"
              >
                {actionLoading
                  ? "Opening..."
                  : "Open Stripe Express Dashboard ↗"}
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-card border border-brand-light/50 bg-surface/80 p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover backdrop-blur-xl"
            >
              <div
                className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${c.iconBg} ${c.iconColor}`}
              >
                <c.Icon className="h-6 w-6" />
              </div>

              <p className={`text-2xl font-black ${c.valueColor}`}>
                {loading ? "-" : c.value}
              </p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">
                {c.label}
              </p>
            </div>
          ))}
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          <h2 className="mb-3 text-lg font-extrabold tracking-tight text-gray-800">
            Session Earnings History
          </h2>

          <div className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl">
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand-dark" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center font-medium text-gray-400">
                No session earnings transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-light/40 bg-brand-light/10">
                      {[
                        "Client",
                        "Session Fee",
                        "PoseFit Cut (20%)",
                        "Your Share (80%)",
                        "Status",
                        "Connect Payout",
                        "Date",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-brand-light/30">
                    {history.map((p) => (
                      <tr
                        key={p._id}
                        className="transition-colors hover:bg-brand-light/10"
                      >

                        <td className="px-5 py-4">
                          <p className="whitespace-nowrap font-bold text-gray-800">
                            {p.user
                              ? `${p.user.firstName} ${p.user.lastName}`
                              : "Client"}
                          </p>

                          <p className="text-xs font-medium text-gray-400">
                            {p.user?.email}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-bold text-gray-800">
                          Rs. {Number(p.amount || 0).toLocaleString()}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-bold text-amber-800">
                          Rs. {Number(p.adminCommission || 0).toLocaleString()}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-extrabold text-brand-dark">
                          Rs. {Number(p.professionalAmount || 0).toLocaleString()}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <StatusBadge status={p.status} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                              p.payoutStatus === "failed" ||
                              p.status === "failed"
                                ? "border-rose-200 bg-rose-50 text-rose-800"
                                : p.payoutStatus === "transferred" ||
                                    p.payoutStatus === "paid" ||
                                    p.status === "completed"
                                  ? "border-brand-light bg-brand-light/30 text-brand-dark"
                                  : "border-gray-200 bg-gray-100 text-gray-600"
                            }`}
                          >
                            {p.payoutStatus === "failed" ||
                            p.status === "failed"
                              ? "Failed"
                              : p.payoutStatus === "transferred" ||
                                  p.payoutStatus === "paid" ||
                                  p.status === "completed"
                                ? "Transferred to Connect"
                                : "Pending"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-gray-500">
                          {new Date(
                            p.paidAt || p.createdAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <button
                            onClick={() => handleDelete(p._id)}
                            className="whitespace-nowrap rounded-btn border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs font-semibold text-gray-400">
            Showing {history.length} transactions
          </p>
        </div>
      </div>
    </ProfessionalLayout>
  );
}