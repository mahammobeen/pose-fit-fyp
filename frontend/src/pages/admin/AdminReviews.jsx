import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";

import { httpClient } from "../../lib/http";
import { toast } from "sonner";
import {
  Search,
  Star,
  Trash2,
  CheckCircle,
  Users,
  UserRound,
} from "lucide-react";

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
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this review?",
      )
    )
      return;

    try {
      await httpClient.delete(`/reviews/${id}`);
      toast.success("Review deleted successfully.");
      await fetchReviews();
    } catch (error) {
      console.error("Delete review error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete review.");
    }
  };

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;

    const userName = `${r.user?.firstName || ""} ${
      r.user?.lastName || ""
    }`.toLowerCase();
    const userEmail = (r.user?.email || "").toLowerCase();
    const proName = `${r.professional?.firstName || ""} ${
      r.professional?.lastName || ""
    }`.toLowerCase();
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
      <div className="min-h-screen pb-16 bg-transparent font-sans">

        <div className="px-4 pt-6 pb-4 sm:px-6 sm:pt-8 lg:px-8">
          <span className="inline-flex rounded-full border border-brand-light/70 bg-brand-light/40 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
            Platform Management
          </span>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
            Reviews & Ratings
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-500">
            Monitor and moderate all user feedback for the PoseFit platform and
            ratings submitted for fitness professionals.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">

          <div className="rounded-card border border-brand-light/60 bg-surface/80 p-5 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Total Reviews
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light/40 text-brand-dark">
                <Star className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-2 text-2xl font-black text-gray-800">
              {stats.totalCount}
            </p>

            <p className="mt-0.5 text-xs text-gray-400">
              All submitted ratings & feedback
            </p>
          </div>

          <div className="rounded-card border border-accent-blue/70 bg-accent-blue/20 p-5 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Platform Feedback
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-blue/50 text-sky-700">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-2 text-2xl font-black text-gray-800">
              {stats.platformCount}
            </p>

            <p className="mt-0.5 text-xs text-gray-400">
              Website & app experience reviews
            </p>
          </div>

          <div className="rounded-card border border-accent-orange/70 bg-accent-orange/20 p-5 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Professional Ratings
              </span>

              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-orange/50 text-accent-orange-dark">
                <UserRound className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-2 text-2xl font-black text-gray-800">
              {stats.professionalCount}
            </p>

            <p className="mt-0.5 text-xs text-gray-400">
              Trainer & Nutritionist ratings
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-col items-stretch justify-between gap-3 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">

          <div className="flex items-center gap-1 overflow-x-auto rounded-card border border-brand-light/50 bg-surface/80 p-1.5 shadow-card backdrop-blur-xl">
            {TYPE_FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setTypeFilter(item.key)}
                className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  typeFilter === item.key
                    ? "bg-gray-800 text-white shadow-card hover:bg-gray-700"
                    : "text-gray-500 hover:bg-brand-light/20 hover:text-gray-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="h-4 w-4" />
            </span>

            <input
              type="text"
              placeholder="Search reviewer, pro, comment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-btn border border-gray-200 bg-white/70 py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 shadow-card outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl">
            {loading ? (
              <div className="flex h-52 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand-dark" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center font-medium text-gray-400">
                {reviews.length === 0
                  ? "No reviews found in this category."
                  : "No reviews match your search query."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-light/40 bg-brand-light/10">
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
                          className="whitespace-nowrap px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-brand-light/30">
                    {filtered.map((r) => {
                      const isPro = r.reviewType === "PROFESSIONAL";
                      const proName = r.professional
                        ? `${r.professional.firstName} ${r.professional.lastName}`
                        : "N/A";

                      return (
                        <tr
                          key={r._id}
                          className="transition-colors hover:bg-brand-light/10"
                        >

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand text-xs font-black text-white shadow-sm">
                                {r.user?.firstName?.[0]?.toUpperCase() || "U"}
                              </div>

                              <div>
                                <p className="whitespace-nowrap font-bold text-gray-800">
                                  {r.user
                                    ? `${r.user.firstName} ${r.user.lastName}`
                                    : "User"}
                                </p>

                                <p className="text-xs font-medium text-gray-400">
                                  {r.user?.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                                isPro
                                  ? "border-brand-light/70 bg-brand-light/30 text-brand-dark"
                                  : "border-accent-blue/70 bg-accent-blue/30 text-sky-800"
                              }`}
                            >
                              {isPro ? "Professional" : "Platform"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            {isPro ? (
                              <div>
                                <p className="font-bold text-gray-800">
                                  {proName}
                                </p>

                                <p className="text-xs font-medium text-gray-400">
                                  {r.professional?.specialization ||
                                    r.professional?.email ||
                                    "Coach"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-gray-400">
                                PoseFit System
                              </span>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className="flex text-xs">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={
                                      i < r.rating
                                        ? "text-accent-orange-dark"
                                        : "text-gray-200"
                                    }
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>

                              <span className="text-xs font-extrabold text-gray-800">
                                {r.rating}.0
                              </span>
                            </div>
                          </td>

                          <td className="max-w-xs px-6 py-4">
                            {r.comment ? (
                              <p
                                className="truncate text-xs font-medium text-gray-700"
                                title={r.comment}
                              >
                                {r.comment}
                              </p>
                            ) : (
                              <span className="text-xs font-medium italic text-gray-400">
                                {isPro
                                  ? "Verified session rating (rating only)"
                                  : "No comment"}
                              </span>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-xs font-medium text-gray-500">
                            {new Date(r.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4">
                            <button
                              onClick={() => handleDelete(r._id)}
                              className="whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-all duration-200 hover:bg-rose-100 hover:-translate-y-0.5"
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

          <p className="mt-3 text-xs font-semibold text-gray-400">
            Showing {filtered.length} of {reviews.length} reviews
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}