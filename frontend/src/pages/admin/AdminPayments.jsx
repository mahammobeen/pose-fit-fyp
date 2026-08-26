import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/admin/Modal";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  IconDollarSign,
  IconBuilding,
  IconTrendingUp,
  IconCheckCircle,
  IconSearch,
  IconRotateCcw,
  IconAlertTriangle,
} from "../../components/admin/Icons";

const STATUS_FILTERS = ["all", "completed", "pending", "refunded", "failed", "cancelled"];

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalProfessionalEarnings, setTotalProfessionalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Refund
  const [refundOpen, setRefundOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/payment/admin/payments");
      setPayments(res.data?.payments || []);
      setTotalRevenue(res.data?.totalRevenue || 0);
      setTotalCommission(res.data?.totalCommission || 0);
      setTotalProfessionalEarnings(res.data?.totalProfessionalEarnings || 0);
    } catch {
      showToast("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = payments.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.user?.firstName?.toLowerCase().includes(q) ||
      p.user?.lastName?.toLowerCase().includes(q) ||
      p.user?.email?.toLowerCase().includes(q) ||
      p.professional?.firstName?.toLowerCase().includes(q) ||
      p.professional?.lastName?.toLowerCase().includes(q) ||
      p.stripeSessionId?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleRefund = async () => {
    setActionLoading(true);
    try {
      await httpClient.post(`/payment/refund/${selectedPayment._id}`);
      showToast("Payment refunded successfully & Connect transfer reversed!");
      setRefundOpen(false);
      fetchPayments();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to process refund.", "error");
      setRefundOpen(false);
    } finally { setActionLoading(false); }
  };

  const summaryCards = [
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      Icon: IconDollarSign,
      bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
      borderColor: "#bbf7d0",
      textColor: "text-emerald-800",
    },
    {
      label: "PoseFit Commission (20%)",
      value: `$${totalCommission.toFixed(2)}`,
      Icon: IconBuilding,
      bgGradient: "linear-gradient(135deg, #fefce8 0%, #ffffff 100%)",
      borderColor: "#fef08a",
      textColor: "text-amber-800",
    },
    {
      label: "Pro Earnings (80%)",
      value: `$${totalProfessionalEarnings.toFixed(2)}`,
      Icon: IconTrendingUp,
      bgGradient: "linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)",
      borderColor: "#bae6fd",
      textColor: "text-sky-800",
    },
    {
      label: "Successful Payments",
      value: payments.filter((p) => p.status === "completed").length,
      Icon: IconCheckCircle,
      bgGradient: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
      borderColor: "#a7f3d0",
      textColor: "text-teal-800",
    },
  ];

  return (
    <AdminLayout>
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
            Platform Payments & Stripe Connect
          </span>
          <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">Payments & Earnings</h1>
          <p className="text-stone-500 font-medium text-sm mt-1">
            Track transactions, 20% platform commissions, 80% professional Connect payouts, and issue refunds.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="px-8 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl p-5 border shadow-xs transition-all hover:shadow-md"
              style={{ background: card.bgGradient, borderColor: card.borderColor }}
            >
              <div className="mb-2">
                <card.Icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
              <p className={`text-2xl font-black ${card.textColor}`}>{card.value}</p>
              <p className="text-xs text-stone-500 font-bold mt-1 uppercase tracking-wider">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="px-8 mb-4 flex items-center gap-3 flex-wrap justify-between">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white rounded-2xl border border-stone-200 p-1.5 shadow-xs">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all ${
                  statusFilter === s
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <IconSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search user, professional..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-300 text-stone-700 font-medium w-72 shadow-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="px-8">
          <div className="bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-52">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-stone-400 font-medium">
                {payments.length === 0 ? "No payment records found." : "No payments match your filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {["User", "Professional", "Total Paid", "PoseFit 20%", "Pro 80%", "Payment Status", "Payout Status", "Action"].map((h) => (
                        <th key={h} className="text-left px-5 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((payment) => (
                      <tr key={payment._id} className="hover:bg-stone-50/70 transition-colors">
                        {/* User */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-stone-800 whitespace-nowrap">
                              {payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : "-"}
                            </p>
                            <p className="text-xs text-stone-400 font-medium">{payment.user?.email}</p>
                          </div>
                        </td>
                        {/* Professional */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-stone-800 whitespace-nowrap">
                              {payment.professional ? `${payment.professional.firstName} ${payment.professional.lastName}` : "-"}
                            </p>
                            <p className="text-xs text-stone-400 font-medium">
                              {payment.professional?.email}
                              {payment.professional?.maskedBank && (
                                <span className="block text-[11px] text-stone-500 font-semibold mt-0.5">
                                  Bank: {payment.professional.maskedBank}
                                </span>
                              )}
                            </p>
                          </div>
                        </td>
                        {/* Amount */}
                        <td className="px-5 py-4 font-black text-stone-900 whitespace-nowrap">
                          ${payment.amount?.toFixed(2)}{" "}
                          <span className="text-xs font-semibold text-stone-400 uppercase">{payment.currency}</span>
                        </td>
                        {/* Commission */}
                        <td className="px-5 py-4 text-amber-800 font-extrabold whitespace-nowrap">
                          ${payment.adminCommission?.toFixed(2)}
                        </td>
                        {/* Pro Amount */}
                        <td className="px-5 py-4 text-emerald-800 font-extrabold whitespace-nowrap">
                          ${payment.professionalAmount?.toFixed(2)}
                        </td>
                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={payment.status} />
                        </td>
                        {/* Payout Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              payment.status === "completed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : payment.status === "refunded"
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : "bg-stone-100 text-stone-600 border-stone-200"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {payment.status === "completed" ? "Transferred to Connect" : payment.status === "refunded" ? "Reversed" : "Pending"}
                          </span>
                        </td>
                        {/* Action */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {payment.status === "completed" ? (
                            <button
                              onClick={() => { setSelectedPayment(payment); setRefundOpen(true); }}
                              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 transition-colors whitespace-nowrap"
                            >
                              <IconRotateCcw className="w-3.5 h-3.5" />
                              <span>Refund</span>
                            </button>
                          ) : (
                            <span className="text-xs text-stone-300 font-medium">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-3 font-semibold">
            Showing {filtered.length} of {payments.length} transactions
          </p>
        </div>

        {/* REFUND MODAL */}
        <Modal isOpen={refundOpen} onClose={() => setRefundOpen(false)} title="Issue Refund" maxWidth="max-w-sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto mb-2">
              <IconRotateCcw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-stone-800 font-extrabold text-lg">Confirm Stripe Refund</p>
              <p className="text-stone-500 text-xs mt-1 font-medium">
                Issue a full Stripe refund of{" "}
                <span className="font-extrabold text-stone-800">${selectedPayment?.amount?.toFixed(2)}</span>{" "}
                to {selectedPayment?.user?.firstName} {selectedPayment?.user?.lastName}?
              </p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-left flex items-start gap-2">
              <IconAlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-bold">
                This will automatically reverse the 80% Connect transfer from the professional and refund the 20% platform fee.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRefundOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 disabled:opacity-60 transition-colors shadow-xs"
              >
                {actionLoading ? "Processing..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
