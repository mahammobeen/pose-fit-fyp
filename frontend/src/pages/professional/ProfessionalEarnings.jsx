import { useState, useEffect, useCallback } from "react";
import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  IconDollarSign,
  IconBuilding,
  IconTrendingUp,
  IconCheckCircle,
  IconClock,
} from "../../components/admin/Icons";

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

  const metrics = earningsData?.earnings;
  const stripe = earningsData?.stripeStatus;
  const history = earningsData?.paymentHistory || [];

  const cards = [
    {
      label: "Total Earnings (80%)",
      value: `$${metrics?.totalEarnings?.toFixed(2) || "0.00"}`,
      Icon: IconDollarSign,
      bg: "bg-emerald-50/70",
      border: "border-emerald-200",
      textColor: "text-emerald-900",
    },
    {
      label: "Current Month",
      value: `$${metrics?.currentMonthEarnings?.toFixed(2) || "0.00"}`,
      Icon: IconTrendingUp,
      bg: "bg-sky-50/70",
      border: "border-sky-200",
      textColor: "text-sky-900",
    },
    {
      label: "Released to Connect",
      value: `$${metrics?.releasedEarnings?.toFixed(2) || "0.00"}`,
      Icon: IconCheckCircle,
      bg: "bg-teal-50/70",
      border: "border-teal-200",
      textColor: "text-teal-900",
    },
    {
      label: "Pending Clearance",
      value: `$${metrics?.pendingEarnings?.toFixed(2) || "0.00"}`,
      Icon: IconClock,
      bg: "bg-amber-50/70",
      border: "border-amber-200",
      textColor: "text-amber-900",
    },
  ];

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
            Financial Dashboard
          </span>
          <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">Earnings & Payouts</h1>
          <p className="text-stone-500 font-medium text-sm mt-1">
            Track your 80% payout shares, Stripe Connect transfer statuses, and session payment history.
          </p>
        </div>

        {/* Stripe Payout Status Card */}
        <div className="px-8 mb-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <IconBuilding className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-stone-800 text-sm flex items-center gap-2">
                  Stripe Express Payout Account
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stripe?.payoutsEnabled ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                    {stripe?.payoutsEnabled ? "Connected & Active" : "Pending Setup"}
                  </span>
                </p>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  {stripe?.payoutsEnabled
                    ? `Automatic 80% session share transfers active ${stripe?.maskedBank ? `(${stripe.maskedBank})` : ""}`
                    : "Connect bank account to receive automatic transfers."}
                </p>
              </div>
            </div>

            {stripe?.payoutsEnabled && (
              <button
                onClick={handleOpenStripeDashboard}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-xs"
              >
                {actionLoading ? "Opening..." : "Launch Stripe Dashboard"}
              </button>
            )}
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="px-8 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-3xl p-5 border shadow-xs ${c.bg} ${c.border}`}>
              <c.Icon className={`w-6 h-6 mb-2 ${c.textColor}`} />
              <p className={`text-2xl font-black ${c.textColor}`}>{loading ? "-" : c.value}</p>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Transaction History Table */}
        <div className="px-8">
          <h2 className="text-lg font-black text-stone-800 mb-3">Session Earnings History</h2>
          <div className="bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-16 text-stone-400 font-medium">
                No session earnings transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {["Client", "Session Fee", "PoseFit Cut (20%)", "Your Share (80%)", "Status", "Connect Payout", "Date"].map((h) => (
                        <th key={h} className="text-left px-5 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {history.map((p) => (
                      <tr key={p._id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-stone-800 whitespace-nowrap">
                            {p.user ? `${p.user.firstName} ${p.user.lastName}` : "Client"}
                          </p>
                          <p className="text-xs text-stone-400 font-medium">{p.user?.email}</p>
                        </td>
                        <td className="px-5 py-4 font-bold text-stone-800 whitespace-nowrap">${p.amount?.toFixed(2)}</td>
                        <td className="px-5 py-4 text-amber-800 font-bold whitespace-nowrap">${p.adminCommission?.toFixed(2)}</td>
                        <td className="px-5 py-4 font-black text-emerald-700 whitespace-nowrap">${p.professionalAmount?.toFixed(2)}</td>
                        <td className="px-5 py-4 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${p.payoutStatus === "transferred" || p.status === "completed" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-stone-100 text-stone-600 border-stone-200"}`}>
                            {p.payoutStatus === "transferred" || p.status === "completed" ? "Transferred to Connect" : "Pending"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-stone-500 font-medium whitespace-nowrap">
                          {new Date(p.paidAt || p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-3 font-semibold">
            Showing {history.length} transactions
          </p>
        </div>
      </div>
    </ProfessionalLayout>
  );
}
