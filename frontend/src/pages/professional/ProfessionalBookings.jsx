import { useState, useEffect, useCallback } from "react";
import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  IconSearch,
  IconClock,
} from "../../components/admin/Icons";

const STATUS_FILTERS = ["all", "completed", "pending", "refunded", "cancelled"];

export default function ProfessionalBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/professional/bookings");
      setBookings(res.data?.bookings || []);
    } catch {
      showToast("Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.user?.firstName?.toLowerCase().includes(q) ||
      b.user?.lastName?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <ProfessionalLayout>
      <div className="min-h-screen pb-16" style={{ background: "#f5f7f2" }}>
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border transition-all ${
              toast.type === "error" ? "bg-rose-500 border-rose-600" : "bg-emerald-600 border-emerald-700"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Session History
          </span>
          <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">My Bookings</h1>
          <p className="text-stone-500 font-medium text-sm mt-1">
            View upcoming, completed, and past client session bookings with appointment slot details.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="px-8 mb-4 flex items-center justify-between gap-3 flex-wrap">
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

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <IconSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by client name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-300 text-stone-700 font-medium w-72 shadow-xs"
            />
          </div>
        </div>

        {/* Bookings List */}
        <div className="px-8">
          <div className="bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-52">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-stone-400 font-medium">
                {bookings.length === 0 ? "No bookings found." : "No bookings match your filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {["Client", "Appointment Slot", "Session Fee", "Pro Share (80%)", "Status", "Date"].map((h) => (
                        <th key={h} className="text-left px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((b) => (
                      <tr key={b._id} className="hover:bg-stone-50/70 transition-colors">
                        {/* Client */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-black shrink-0"
                              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                            >
                              {b.user?.firstName?.[0]?.toUpperCase() || "C"}
                            </div>
                            <div>
                              <p className="font-bold text-stone-800 whitespace-nowrap">
                                {b.user ? `${b.user.firstName} ${b.user.lastName}` : "Client"}
                              </p>
                              <p className="text-xs text-stone-400 font-medium">{b.user?.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Appointment Slot */}
                        <td className="px-6 py-4">
                          {b.appointmentDay && b.appointmentSlot ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                                <IconClock className="w-3 h-3 text-emerald-600" />
                                {b.appointmentDay.slice(0, 3)} - {b.appointmentSlot}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400 font-medium italic">Not specified</span>
                          )}
                        </td>

                        {/* Session Fee */}
                        <td className="px-6 py-4 font-bold text-stone-800 whitespace-nowrap">
                          ${b.amount?.toFixed(2)}
                        </td>

                        {/* Pro Share */}
                        <td className="px-6 py-4 font-black text-emerald-700 whitespace-nowrap">
                          ${b.professionalAmount?.toFixed(2)}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={b.status} />
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-stone-500 text-xs font-medium whitespace-nowrap">
                          {new Date(b.paidAt || b.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-3 font-semibold">
            Showing {filtered.length} of {bookings.length} session bookings
          </p>
        </div>
      </div>
    </ProfessionalLayout>
  );
}
