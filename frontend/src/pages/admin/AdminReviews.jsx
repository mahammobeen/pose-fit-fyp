import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";
import {
  IconSearch,
  IconStar,
  IconTrash,
  IconCheckCircle,
  IconUsers,
  IconProfessional,
} from "../../components/admin/Icons";

const TYPE_FILTERS = [
  { key: "all", label: "All Reviews" },
  { key: "PLATFORM", label: "Platform Reviews" },
  { key: "PROFESSIONAL", label: "Professional Ratings" },
];

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    totalCount: 0,
    platformCount: 0,
    professionalCount: 0,
  });

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        typeFilter === "all"
          ? "/reviews/admin"
          : `/reviews/admin?type=${typeFilter}`;

      const res = await httpClient.get(url);
      setReviews(res.data?.reviews || []);
      setStats({
        totalCount: res.data?.totalCount || res.data?.count || 0,
        platformCount: res.data?.platformCount || 0,
        professionalCount: res.data?.professionalCount || 0,
      });
    } catch (error) {
      console.error("Fetch admin reviews error:", error);
      toast.error("Failed to load reviews list");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?"))
      return;

    try {
      await httpClient.delete(`/reviews/${id}`);
      toast.success("Review deleted successfully.");
      await fetchReviews();
    } catch (error) {
      console.error("Delete review error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete review."
      );
    }
  };

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;

    const userName = `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.toLowerCase();
    const userEmail = (r.user?.email || "").toLowerCase();
    const proName = `${r.professional?.firstName || ""} ${r.professional?.lastName || ""}`.toLowerCase();
    const comment = (r.comment || "").toLowerCase();

    return (
      userName.includes(q) ||
      userEmail.includes(q) ||
      proName.includes(q) ||
      comment.includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="min-h-screen pb-16" style={{ background: "#f5f7f2" }}>
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4">
          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-emerald-800">
            Platform Management
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-stone-800">
            Reviews & Ratings
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-500">
            Monitor and moderate all user feedback for the PoseFit platform and
            ratings submitted for fitness professionals.
          </p>
        </div>

        {/* Metric Summary Cards */}
        <div className="px-4 sm:px-6 lg:px-8 mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Total Reviews
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <IconStar className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-stone-900">
              {stats.totalCount}
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              All submitted ratings & feedback
            </p>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Platform Feedback
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <IconCheckCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-stone-900">
              {stats.platformCount}
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              Website & app experience reviews
            </p>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Professional Ratings
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <IconProfessional className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-stone-900">
              {stats.professionalCount}
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              Trainer & Nutritionist ratings
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="px-4 sm:px-6 lg:px-8 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xs overflow-x-auto">
            {TYPE_FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setTypeFilter(item.key)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all whitespace-nowrap ${
                  typeFilter === item.key
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search reviewer, pro, comment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-stone-700 shadow-xs outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs">
            {loading ? (
              <div className="flex h-52 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-stone-400 font-medium">
                {reviews.length === 0
                  ? "No reviews found in this category."
                  : "No reviews match your search query."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      {[
                        "Reviewer",
                        "Type",
                        "Target / Professional",
                        "Rating",
                        "Comment",
                        "Date",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((r) => {
                      const isPro = r.reviewType === "PROFESSIONAL";
                      const proName = r.professional
                        ? `${r.professional.firstName} ${r.professional.lastName}`
                        : "N/A";

                      return (
                        <tr
                          key={r._id}
                          className="transition-colors hover:bg-stone-50/70"
                        >
                          {/* Reviewer */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black text-white"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #10b981, #059669)",
                                }}
                              >
                                {r.user?.firstName?.[0]?.toUpperCase() || "U"}
                              </div>
                              <div>
                                <p className="font-bold text-stone-800 whitespace-nowrap">
                                  {r.user
                                    ? `${r.user.firstName} ${r.user.lastName}`
                                    : "User"}
                                </p>
                                <p className="text-xs font-medium text-stone-400">
                                  {r.user?.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                                isPro
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border border-blue-200 bg-blue-50 text-blue-800"
                              }`}
                            >
                              {isPro ? "Professional" : "Platform"}
                            </span>
                          </td>

                          {/* Target */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isPro ? (
                              <div>
                                <p className="font-bold text-stone-800">
                                  {proName}
                                </p>
                                <p className="text-xs font-medium text-stone-400">
                                  {r.professional?.specialization ||
                                    r.professional?.email ||
                                    "Coach"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-stone-400">
                                PoseFit System
                              </span>
                            )}
                          </td>

                          {/* Rating */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="flex text-amber-400 text-xs">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={
                                      i < r.rating
                                        ? "text-amber-400"
                                        : "text-stone-200"
                                    }
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs font-extrabold text-stone-800">
                                {r.rating}.0
                              </span>
                            </div>
                          </td>

                          {/* Comment */}
                          <td className="max-w-xs px-6 py-4">
                            {r.comment ? (
                              <p className="truncate text-xs font-medium text-stone-700" title={r.comment}>
                                {r.comment}
                              </p>
                            ) : (
                              <span className="text-xs text-stone-400 font-medium italic">
                                {isPro ? "Verified session rating (rating only)" : "No comment"}
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-6 py-4 text-xs font-medium text-stone-500 whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>

                          {/* Action */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleDelete(r._id)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs font-semibold text-stone-400">
            Showing {filtered.length} of {reviews.length} reviews
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
