
import { useState, useEffect, useCallback } from "react";
import UserLayout from "../../components/user/UserLayout";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";
import { Star, Trash2, CheckCircle } from "lucide-react";

const RATING_LABELS = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent",
};

export default function UserReviews() {
  const [activeTab, setActiveTab] = useState("platform");
  const [reviews, setReviews] = useState([]);
  const [publicPlatformReviews, setPublicPlatformReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [platformRating, setPlatformRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [platformComment, setPlatformComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteReviewId, setDeleteReviewId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMyReviews = useCallback(async () => {
    try {
      setLoading(true);

      const [myRes, pubRes] = await Promise.all([
        httpClient.get("/reviews/my-reviews"),
        httpClient.get("/reviews/platform"),
      ]);

      setReviews(myRes.data?.reviews || []);
      setPublicPlatformReviews(pubRes.data?.reviews || []);
    } catch (error) {
      console.error("Fetch reviews error:", error);
      toast.error("Failed to load reviews data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyReviews();
  }, [fetchMyReviews]);

  const handlePlatformSubmit = async (e) => {
    e.preventDefault();

    if (!platformRating || platformRating < 1 || platformRating > 5) {
      toast.error("Please select a star rating between 1 and 5.");
      return;
    }

    if (!platformComment.trim()) {
      toast.error("Please enter a written comment for your platform review.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await httpClient.post("/reviews/platform", {
        reviewType: "PLATFORM",
        rating: platformRating,
        comment: platformComment.trim(),
      });

      toast.success(res.data?.message || "Platform feedback submitted!");
      setPlatformComment("");
      setPlatformRating(5);

      await fetchMyReviews();
    } catch (error) {
      console.error("Submit platform review error:", error);

      toast.error(
        error?.response?.data?.message ||
          "Failed to submit platform feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = (reviewId) => {
    setDeleteReviewId(reviewId);
  };

  const confirmDeleteReview = async () => {
    if (!deleteReviewId) return;

    try {
      setDeleting(true);

      await httpClient.delete(`/reviews/${deleteReviewId}`);

      toast.success("Review deleted successfully.");

      setDeleteReviewId(null);
      await fetchMyReviews();
    } catch (error) {
      console.error("Delete review error:", error);

      toast.error(
        error?.response?.data?.message || "Failed to delete review.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const myPlatformReviews = reviews.filter(
    (r) => r.reviewType === "PLATFORM",
  );

  const myProfessionalRatings = reviews.filter(
    (r) => r.reviewType === "PROFESSIONAL",
  );

  return (
    <UserLayout>
      <div className="min-h-screen bg-transparent pb-20 font-sans">
        <div className="border-b border-gray-200/70 bg-surface/70 px-4 py-7 backdrop-blur-xl sm:px-6 sm:py-9 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Reviews & Ratings
            </div>

            <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
              Your Feedback & Ratings
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-gray-500">
              Share your experience with PoseFit and keep track of the
              professionals you have rated.
            </p>

            <div className="mt-7 flex overflow-x-auto border-b border-gray-200/80">
              <button
                onClick={() => setActiveTab("platform")}
                className={`relative mr-7 flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3.5 pt-2 text-sm font-bold transition-colors ${
                  activeTab === "platform"
                    ? "border-brand text-gray-800"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <Star
                  className={`h-4 w-4 ${
                    activeTab === "platform"
                      ? "fill-brand text-brand"
                      : "text-gray-400"
                  }`}
                />

                Platform Reviews

                <span
                  className={`ml-1 text-xs font-bold ${
                    activeTab === "platform"
                      ? "text-brand-dark"
                      : "text-gray-400"
                  }`}
                >
                  {myPlatformReviews.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("professional")}
                className={`relative flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3.5 pt-2 text-sm font-bold transition-colors ${
                  activeTab === "professional"
                    ? "border-brand text-gray-800"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <Star
                  className={`h-4 w-4 ${
                    activeTab === "professional"
                      ? "fill-brand text-brand"
                      : "text-gray-400"
                  }`}
                />

                Professional Ratings

                <span
                  className={`ml-1 text-xs font-bold ${
                    activeTab === "professional"
                      ? "text-brand-dark"
                      : "text-gray-400"
                  }`}
                >
                  {myProfessionalRatings.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          {activeTab === "platform" && (
            <>
              <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <div className="rounded-card border border-gray-200/80 bg-surface/80 shadow-card backdrop-blur-xl">
                    <div className="border-b border-gray-200/70 px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-btn bg-brand-light/40">
                          <Star className="h-4 w-4 fill-brand-dark text-brand-dark" />
                        </div>

                        <div>
                          <h2 className="text-base font-extrabold text-gray-800">
                            Review PoseFit
                          </h2>

                          <p className="mt-0.5 text-xs font-medium text-gray-400">
                            Tell us about your experience.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form
                      onSubmit={handlePlatformSubmit}
                      className="space-y-6 px-6 py-6"
                    >
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Rating
                        </label>

                        <div className="mt-3 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setPlatformRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="rounded-md p-1 transition-transform hover:scale-105 focus:outline-none"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  star <= (hoverRating || platformRating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-gray-100 text-gray-200"
                                }`}
                              />
                            </button>
                          ))}

                          <span className="ml-2 text-xs font-bold text-gray-500">
                            {RATING_LABELS[hoverRating || platformRating]}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Your Review
                          </label>

                          <span className="text-[10px] font-medium text-gray-400">
                            {platformComment.length}/1000
                          </span>
                        </div>

                        <textarea
                          rows={5}
                          value={platformComment}
                          onChange={(e) =>
                            setPlatformComment(e.target.value)
                          }
                          placeholder="Share your experience with PoseFit..."
                          maxLength={1000}
                          required
                          className="mt-2.5 w-full resize-none rounded-btn border border-gray-200 bg-white/70 px-3.5 py-3 text-xs font-medium leading-relaxed text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-light/50"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary w-full py-3.5 shadow-card hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? "Submitting..." : "Submit Review"}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="rounded-card border border-gray-200/80 bg-surface/80 shadow-card backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-200/70 px-6 py-5">
                      <div>
                        <h2 className="text-base font-extrabold text-gray-800">
                          Your Platform Reviews
                        </h2>

                        <p className="mt-0.5 text-xs font-medium text-gray-400">
                          Reviews you have submitted to PoseFit.
                        </p>
                      </div>

                      <span className="text-xs font-bold text-gray-400">
                        {myPlatformReviews.length}{" "}
                        {myPlatformReviews.length === 1
                          ? "review"
                          : "reviews"}
                      </span>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {loading ? (
                        <div className="flex h-32 items-center justify-center">
                          <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-light border-t-brand" />
                        </div>
                      ) : myPlatformReviews.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                          <Star className="mx-auto h-7 w-7 text-gray-300" />

                          <p className="mt-3 text-sm font-bold text-gray-600">
                            No platform reviews yet
                          </p>

                          <p className="mt-1 text-xs font-medium text-gray-400">
                            Your submitted feedback will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {myPlatformReviews.map((item) => (
                            <div
                              key={item._id}
                              className="px-6 py-5 transition-colors hover:bg-gray-50/50"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-3.5 w-3.5 ${
                                            i < item.rating
                                              ? "fill-amber-400 text-amber-400"
                                              : "fill-gray-100 text-gray-200"
                                          }`}
                                        />
                                      ))}
                                    </div>

                                    <span className="text-xs font-extrabold text-gray-700">
                                      {item.rating}.0
                                    </span>
                                  </div>

                                  <p className="mt-2.5 text-sm font-medium leading-6 text-gray-700">
                                    {item.comment}
                                  </p>

                                  <p className="mt-2 text-[11px] font-medium text-gray-400">
                                    {new Date(
                                      item.createdAt,
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>

                                <button
                                  onClick={() =>
                                    handleDeleteReview(item._id)
                                  }
                                  title="Delete feedback"
                                  className="shrink-0 rounded-btn border border-gray-200 p-2 text-gray-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 rounded-card border border-gray-200/80 bg-surface/80 shadow-card backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200/70 px-6 py-5">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800">
                      Community Reviews
                    </h2>

                    <p className="mt-0.5 text-xs font-medium text-gray-400">
                      Feedback shared by PoseFit users.
                    </p>
                  </div>

                  <span className="text-xs font-bold text-gray-400">
                    {publicPlatformReviews.length}{" "}
                    {publicPlatformReviews.length === 1
                      ? "review"
                      : "reviews"}
                  </span>
                </div>

                {publicPlatformReviews.length === 0 ? (
                  <div className="px-6 py-10 text-center text-xs font-medium text-gray-400">
                    No public platform reviews available yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {publicPlatformReviews.map((item) => (
                      <div
                        key={item._id}
                        className="px-6 py-5 transition-colors hover:bg-gray-50/50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light/50 text-xs font-extrabold text-brand-dark">
                              {item.user?.firstName?.[0]?.toUpperCase() ||
                                "U"}
                            </div>

                            <p className="truncate text-xs font-bold text-gray-800">
                              {item.user
                                ? `${item.user.firstName} ${item.user.lastName}`
                                : "PoseFit User"}
                            </p>
                          </div>

                          <div className="flex shrink-0">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < item.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-gray-100 text-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="mt-3 text-xs font-medium leading-5 text-gray-600">
                          {item.comment}
                        </p>

                        <p className="mt-2 text-[10px] font-medium text-gray-400">
                          {new Date(
                            item.createdAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "professional" && (
            <div>
              <div className="rounded-card border border-gray-200/80 bg-surface/80 shadow-card backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4 border-b border-gray-200/70 px-6 py-5">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-800">
                      Professional Ratings
                    </h2>

                    <p className="mt-0.5 text-xs font-medium text-gray-400">
                      Ratings submitted after your completed professional
                      sessions.
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-bold text-gray-400">
                    {myProfessionalRatings.length}{" "}
                    {myProfessionalRatings.length === 1
                      ? "session"
                      : "sessions"}
                  </span>
                </div>

                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand" />
                  </div>
                ) : myProfessionalRatings.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-brand-light/30">
                      <Star className="h-5 w-5 text-brand-dark" />
                    </div>

                    <p className="mt-4 text-sm font-bold text-gray-700">
                      No rated sessions yet
                    </p>

                    <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-gray-400">
                      Ratings become available after your booked professional
                      sessions have ended.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {myProfessionalRatings.map((item) => {
                      const proName = item.professional
                        ? `${item.professional.firstName} ${item.professional.lastName}`
                        : "Fitness Professional";

                      return (
                        <div
                          key={item._id}
                          className="px-6 py-6 transition-colors hover:bg-gray-50/40"
                        >
                          <div className="flex items-start gap-5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand text-sm font-black text-white shadow-card">
                              {item.professional?.firstName?.[0]?.toUpperCase() ||
                                "P"}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-5">
                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-extrabold text-gray-800">
                                    {proName}
                                  </h3>

                                  <p className="mt-0.5 truncate text-xs font-bold text-brand-dark">
                                    {item.professional?.specialization ||
                                      "Certified Professional"}
                                  </p>
                                </div>

                                <button
                                  onClick={() =>
                                    handleDeleteReview(item._id)
                                  }
                                  title="Delete rating"
                                  className="shrink-0 rounded-btn border border-gray-200 p-2 text-gray-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="mt-5 flex items-center gap-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < item.rating
                                          ? "fill-amber-400 text-amber-400"
                                          : "fill-gray-100 text-gray-200"
                                      }`}
                                    />
                                  ))}
                                </div>

                                <span className="text-xs font-extrabold text-gray-700">
                                  {item.rating}.0 / 5.0
                                </span>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                                  <CheckCircle className="h-3.5 w-3.5 shrink-0 text-brand" />
                                  Session Verified
                                  {item.payment?.appointmentDay
                                    ? ` · ${item.payment.appointmentDay}`
                                    : ""}
                                </span>

                                <span className="text-[10px] font-medium text-gray-400">
                                  {new Date(
                                    item.createdAt,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteReviewId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-card border border-gray-200/80 bg-surface p-6 shadow-card-hover">
            <div className="flex h-11 w-11 items-center justify-center rounded-card bg-rose-50">
              <Trash2 className="h-5 w-5 text-rose-600" />
            </div>

            <h2 className="mt-5 text-lg font-extrabold text-gray-800">
              Delete Review?
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
              Are you sure you want to delete this review? This action cannot
              be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteReviewId(null)}
                disabled={deleting}
                className="rounded-btn border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteReview}
                disabled={deleting}
                className="rounded-btn bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
