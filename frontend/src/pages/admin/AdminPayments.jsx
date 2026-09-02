
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  IconDollarSign,
  IconBuilding,
  IconTrendingUp,
  IconCheckCircle,
  IconSearch,
} from "../../components/admin/Icons";

const STATUS_FILTERS = [
  "all",
  "completed",
  "pending",
  "failed",
];

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalProfessionalEarnings, setTotalProfessionalEarnings] =
    useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
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
        res.data?.totalProfessionalEarnings || 0
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

  // Delete payment from admin history
  const handleDelete = async (paymentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this payment record? This will only remove it from the admin payment history."
    );

    if (!confirmed) return;

    try {
      await httpClient.delete(
        `/payment/admin/payments/${paymentId}`
      );

      showToast("Payment record deleted successfully.");

      await fetchPayments();
    } catch (error) {
      console.error("Delete payment error:", error);

      showToast(
        error?.response?.data?.message ||
          "Failed to delete payment record.",
        "error"
      );
    }
  };

  const filtered = payments.filter((p) => {
    const matchStatus =
      statusFilter === "all" || p.status === statusFilter;

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
      Icon: IconDollarSign,
      bgGradient:
        "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
      borderColor: "#bbf7d0",
      textColor: "text-emerald-800",
    },
    {
      label: "PoseFit Commission (20%)",
      value: `$${totalCommission.toFixed(2)}`,
      Icon: IconBuilding,
      bgGradient:
        "linear-gradient(135deg, #fefce8 0%, #ffffff 100%)",
      borderColor: "#fef08a",
      textColor: "text-amber-800",
    },
    {
      label: "Pro Earnings (80%)",
      value: `$${totalProfessionalEarnings.toFixed(2)}`,
      Icon: IconTrendingUp,
      bgGradient:
        "linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)",
      borderColor: "#bae6fd",
      textColor: "text-sky-800",
    },
    {
      label: "Successful Payments",
      value: payments.filter(
        (p) => p.status === "completed"
      ).length,
      Icon: IconCheckCircle,
      bgGradient:
        "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
      borderColor: "#a7f3d0",
      textColor: "text-teal-800",
    },
  ];

  return (
    <AdminLayout>
      <div
        className="min-h-screen pb-16"
        style={{ background: "#f5f7f2" }}
      >
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border transition-all ${
              toast.type === "error"
                ? "bg-rose-500 border-rose-600"
                : "bg-emerald-600 border-emerald-700"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4">
          <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Platform Payments & Stripe Connect
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-stone-800 tracking-tight mt-2">
            Payments & Earnings
          </h1>

          <p className="text-stone-500 font-medium text-sm mt-1">
            Track transactions, 20% platform commissions, and 80%
            professional Connect payouts.
          </p>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl p-5 border shadow-xs transition-all hover:shadow-md"
              style={{
                background: card.bgGradient,
                borderColor: card.borderColor,
              }}
            >
              <div className="mb-2">
                <card.Icon
                  className={`w-6 h-6 ${card.textColor}`}
                />
              </div>

              <p
                className={`text-2xl font-black ${card.textColor}`}
              >
                {card.value}
              </p>

              <p className="text-xs text-stone-500 font-bold mt-1 uppercase tracking-wider">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        <div className="px-4 sm:px-6 lg:px-8 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-1 bg-white rounded-2xl border border-stone-200 p-1.5 shadow-xs overflow-x-auto">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <IconSearch className="w-4 h-4" />
            </span>

            <input
              type="text"
              placeholder="Search user, professional..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-300 text-stone-700 font-medium w-full shadow-xs"
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-52">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-stone-400 font-medium">
                {payments.length === 0
                  ? "No payment records found."
                  : "No payments match your filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
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
                          className="text-left px-5 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((payment) => (
                      <tr
                        key={payment._id}
                        className="hover:bg-stone-50/70 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-stone-800 whitespace-nowrap">
                              {payment.user
                                ? `${payment.user.firstName} ${payment.user.lastName}`
                                : "-"}
                            </p>

                            <p className="text-xs text-stone-400 font-medium">
                              {payment.user?.email}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-stone-800 whitespace-nowrap">
                              {payment.professional
                                ? `${payment.professional.firstName} ${payment.professional.lastName}`
                                : "-"}
                            </p>

                            <p className="text-xs text-stone-400 font-medium">
                              {payment.professional?.email}

                              {payment.professional?.maskedBank && (
                                <span className="block text-[11px] text-stone-500 font-semibold mt-0.5">
                                  Bank:{" "}
                                  {payment.professional.maskedBank}
                                </span>
                              )}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-black text-stone-900 whitespace-nowrap">
                          ${payment.amount?.toFixed(2)}{" "}
                          <span className="text-xs font-semibold text-stone-400 uppercase">
                            {payment.currency}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-amber-800 font-extrabold whitespace-nowrap">
                          ${payment.adminCommission?.toFixed(2)}
                        </td>

                        <td className="px-5 py-4 text-emerald-800 font-extrabold whitespace-nowrap">
                          ${payment.professionalAmount?.toFixed(2)}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={payment.status} />
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              payment.status === "completed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-stone-100 text-stone-600 border-stone-200"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />

                            {payment.status === "completed"
                              ? "Transferred to Connect"
                              : "Pending"}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            onClick={() =>
                              handleDelete(payment._id)
                            }
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors whitespace-nowrap"
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

          <p className="text-xs text-stone-400 mt-3 font-semibold">
            Showing {filtered.length} of {payments.length} transactions
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

