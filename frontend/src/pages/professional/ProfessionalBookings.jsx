import { useState, useEffect, useCallback } from "react";
import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import { Search, Clock } from "lucide-react";

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
];

function getBookingStatus(booking, tab) {
  if (tab === "pending") return "pending";
  if (tab === "completed") return "completed";
  if (!booking?.appointmentDate) return "completed";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(booking.appointmentDate) >= startOfToday ? "pending" : "completed";
}

export default function ProfessionalBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });

    setTimeout(() => setToast(null), 3500);
  };

  const fetchBookings = useCallback(async (tabToFetch = activeTab) => {
    try {
      setLoading(true);

      const res = await httpClient.get(`/professional/bookings?tab=${tabToFetch}`);

      setBookings(res.data?.bookings || []);
    } catch (error) {
      console.error("Fetch bookings error:", error);
      showToast("Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchBookings(activeTab);
  }, [activeTab, fetchBookings]);

  // Delete booking from professional history
  const handleDelete = async (bookingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this booking record? This will only remove it from your booking history.",
    );

    if (!confirmed) return;

    try {
      await httpClient.delete(`/payment/professional/payments/${bookingId}`);

      showToast("Booking record deleted successfully.");

      await fetchBookings(activeTab);
    } catch (error) {
      console.error("Delete booking error:", error);

      showToast(
        error?.response?.data?.message || "Failed to delete booking record.",
        "error",
      );
    }
  };

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();

    const matchSearch =
      !q ||
      b.user?.firstName?.toLowerCase().includes(q) ||
      b.user?.lastName?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q);

    return matchSearch;
  });

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
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <span className="inline-flex rounded-full border border-brand-light/70 bg-brand-light/40 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
            Session History
          </span>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
            My Bookings
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-500">
            View upcoming, completed, and past client session bookings with
            appointment slot details.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="mb-4 flex flex-col items-stretch justify-between gap-3 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-card border border-brand-light/50 bg-surface/80 p-1.5 shadow-card backdrop-blur-xl">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-1.5 text-xs font-extrabold capitalize transition-all duration-200 ${
                  activeTab === t.id
                    ? "bg-gray-800 text-white shadow-card"
                    : "text-gray-500 hover:bg-brand-light/20 hover:text-gray-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="h-4 w-4" />
            </span>

            <input
              type="text"
              placeholder="Search by client name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-btn border border-gray-200 bg-white/70 py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 shadow-card outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
            />
          </div>
        </div>

        {/* Bookings Table */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl">
            {loading ? (
              <div className="flex h-52 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand-dark" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center font-medium text-gray-400">
                {bookings.length === 0
                  ? "No bookings found."
                  : "No bookings match your filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-light/40 bg-brand-light/10">
                      {[
                        "Client",
                        "Appointment Slot",
                        "Session Fee",
                        "Pro Share (80%)",
                        "Status",
                        "Date",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-brand-light/30">
                    {filtered.map((b) => (
                      <tr
                        key={b._id}
                        className="transition-colors hover:bg-brand-light/10"
                      >
                        {/* Client */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand text-xs font-black text-white shadow-sm">
                              {b.user?.firstName?.[0]?.toUpperCase() || "C"}
                            </div>

                            <div>
                              <p className="whitespace-nowrap font-bold text-gray-800">
                                {b.user
                                  ? `${b.user.firstName} ${b.user.lastName}`
                                  : "Client"}
                              </p>

                              <p className="text-xs font-medium text-gray-400">
                                {b.user?.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Appointment Slot */}
                        <td className="px-6 py-4">
                          {b.appointmentDay && b.appointmentSlot ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand-light/70 bg-brand-light/25 px-3 py-1.5 text-xs font-bold text-brand-dark">
                                <Clock className="h-3 w-3 text-brand-dark" />
                                {b.appointmentDay.slice(0, 3)} -{" "}
                                {b.appointmentSlot}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium italic text-gray-400">
                              Not specified
                            </span>
                          )}
                        </td>

                        {/* Session Fee */}
                        <td className="whitespace-nowrap px-6 py-4 font-bold text-gray-800">
                          ${b.amount?.toFixed(2)}
                        </td>

                        {/* Professional Share */}
                        <td className="whitespace-nowrap px-6 py-4 font-extrabold text-brand-dark">
                          ${b.professionalAmount?.toFixed(2)}
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusBadge status={getBookingStatus(b, activeTab)} />
                        </td>

                        {/* Date */}
                        <td className="whitespace-nowrap px-6 py-4 text-xs font-medium text-gray-500">
                          {b.appointmentDate ? (
                            new Date(b.appointmentDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          ) : (
                            new Date(b.paidAt || b.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          )}
                        </td>

                        {/* Action */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <button
                            onClick={() => handleDelete(b._id)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-800 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-100"
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
            Showing {filtered.length} of {bookings.length} session bookings
          </p>
        </div>
      </div>
    </ProfessionalLayout>
  );
}