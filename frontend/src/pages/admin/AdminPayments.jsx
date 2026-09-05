import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  DollarSign,
  Building2,
  TrendingUp,
  CheckCircle,
  Search,
} from "lucide-react";

const STATUS_FILTERS = ["completed", "failed"];

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalProfessionalEarnings, setTotalProfessionalEarnings] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("completed");
  const [search, setSearch] = useState("");
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
      setTotalProfessionalEarnings(
        res.data?.totalProfessionalEarnings || 0,
      );
    } catch (error) {
      console.error("Fetch payments error:", error);
      showToast("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDelete = async (paymentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this payment record? This will only remove it from the admin payment history.",
    );

    if (!confirmed) return;

    try {
      await httpClient.delete(`/payment/admin/payments/${paymentId}`);

      showToast("Payment record deleted successfully.");

      await fetchPayments();
    } catch (error) {
      console.error("Delete payment error:", error);

      showToast(
        error?.response?.data?.message ||
          "Failed to delete payment record.",
        "error",
      );
    }
  };

  const filtered = payments.filter((p) => {
    const matchStatus = p.status === statusFilter;

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

  const summaryCards = [
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      Icon: DollarSign,
      bg: "linear-gradient(135deg, rgba(183, 228, 199, 0.45) 0%, rgba(255, 253, 245, 0.96) 100%)",
      border: "#b7e4c7",
      iconBg: "rgba(183, 228, 199, 0.65)",
      text: "text-brand-dark",
    },
    {
      label: "PoseFit Commission (20%)",
      value: `$${totalCommission.toFixed(2)}`,
      Icon: Building2,
      bg: "linear-gradient(135deg, rgba(255, 216, 177, 0.42) 0%, rgba(255, 253, 245, 0.96) 100%)",
      border: "#ffd8b1",
      iconBg: "rgba(255, 216, 177, 0.65)",
      text: "text-[#a95f22]",
    },
    {
      label: "Pro Earnings (80%)",
      value: `$${totalProfessionalEarnings.toFixed(2)}`,
      Icon: TrendingUp,
      bg: "linear-gradient(135deg, rgba(208, 235, 255, 0.48) 0%, rgba(255, 253, 245, 0.96) 100%)",
      border: "#d0ebff",
      iconBg: "rgba(208, 235, 255, 0.7)",
      text: "text-[#176b9c]",
    },
    {
      label: "Successful Payments",
      value: payments.filter((p) => p.status === "completed").length,
      Icon: CheckCircle,
      bg: "linear-gradient(135deg, rgba(183, 228, 199, 0.38) 0%, rgba(255, 253, 245, 0.96) 100%)",
      border: "#b7e4c7",
      iconBg: "rgba(183, 228, 199, 0.6)",
      text: "text-brand-dark",
    },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen pb-16 bg-transparent font-sans">
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-btn shadow-card-hover text-white text-sm font-bold border transition-all ${
              toast.type === "error"
                ? "bg-rose-500 border-rose-600"
                : "bg-brand-dark border-brand-dark"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-5">
          <div className="rounded-card border border-brand-light/60 bg-surface/75 backdrop-blur-xl shadow-card p-6 sm:p-7">
            <span className="inline-flex text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-light/45 text-brand-dark border border-brand-light">
              Platform Payments & Stripe Connect
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight mt-3">
              Payments & Earnings
            </h1>

            <p className="text-gray-500 font-medium text-sm mt-1">
              Track transactions, 20% platform commissions, and 80%
              professional Connect payouts.
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-card p-5 border shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover backdrop-blur-xl"
              style={{
                background: card.bg,
                borderColor: card.border,
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: card.iconBg }}
              >
                <card.Icon className={`w-6 h-6 ${card.text}`} />
              </div>

              <p className={`text-2xl font-black ${card.text}`}>
                {card.value}
              </p>

              <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-wider">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        <div className="px-4 sm:px-6 lg:px-8 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-1 bg-surface/80 rounded-btn border border-brand-light/60 p-1.5 shadow-card overflow-x-auto backdrop-blur-xl">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? "bg-gray-800 text-white shadow-card"
                    : "text-gray-500 hover:text-gray-800 hover:bg-brand-light/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4" />
            </span>

            <input
              type="text"
              placeholder="Search user, professional..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 font-medium outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 shadow-card"
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="rounded-card shadow-card border border-brand-light/50 overflow-hidden bg-surface/85 backdrop-blur-xl">
            {loading ? (
              <div className="flex items-center justify-center h-52">
                <div className="w-8 h-8 border-4 border-brand-light border-t-brand rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-medium">
                {payments.length === 0
                  ? "No payment records found."
                  : "No payments match your filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-light/15 border-b border-brand-light/50">
                      {[
                        "User",
                        "Professional",
                        "Total Paid",
                        "PoseFit 20%",
                        "Pro 80%",
                        "Payment Status",
                        "Payout Status",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-brand-light/30">
                    {filtered.map((payment) => (
                      <tr
                        key={payment._id}
                        className="hover:bg-brand-light/10 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-gray-800 whitespace-nowrap">
                              {payment.user
                                ? `${payment.user.firstName} ${payment.user.lastName}`
                                : "-"}
                            </p>

                            <p className="text-xs text-gray-400 font-medium">
                              {payment.user?.email}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-gray-800 whitespace-nowrap">
                              {payment.professional
                                ? `${payment.professional.firstName} ${payment.professional.lastName}`
                                : "-"}
                            </p>

                            <p className="text-xs text-gray-400 font-medium">
                              {payment.professional?.email}

                              {payment.professional?.maskedBank && (
                                <span className="block text-[11px] text-gray-500 font-semibold mt-0.5">
                                  Bank: {payment.professional.maskedBank}
                                </span>
                              )}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-black text-gray-800 whitespace-nowrap">
                          ${payment.amount?.toFixed(2)}{" "}
                          <span className="text-xs font-semibold text-gray-400 uppercase">
                            {payment.currency}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[#a95f22] font-extrabold whitespace-nowrap">
                          ${payment.adminCommission?.toFixed(2)}
                        </td>

                        <td className="px-5 py-4 text-brand-dark font-extrabold whitespace-nowrap">
                          ${payment.professionalAmount?.toFixed(2)}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={payment.status} />
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              payment.status === "completed"
                                ? "bg-brand-light/35 text-brand-dark border-brand-light"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />

                            {payment.status === "completed"
                              ? "Transferred to Connect"
                              : "Failed / Unpaid"}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(payment._id)}
                            className="px-3.5 py-1.5 rounded-btn text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors whitespace-nowrap"
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

          <p className="text-xs text-gray-400 mt-3 font-semibold">
            Showing {filtered.length} of {payments.length} transactions
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}