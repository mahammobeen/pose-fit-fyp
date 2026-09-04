import { useState, useEffect, useCallback } from "react";
import UserLayout from "../../components/user/UserLayout";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";
import {
  IconStar,
  IconTrash,
  IconCheckCircle,
} from "../../components/admin/Icons";

const RATING_LABELS = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent",
};

export default function UserReviews() {
  const [activeTab, setActiveTab] = useState("platform"); // "platform" | "professional"
  const [reviews, setReviews] = useState([]);
  const [publicPlatformReviews, setPublicPlatformReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Platform review form state
  const [platformRating, setPlatformRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [platformComment, setPlatformComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        error?.response?.data?.message || "Failed to submit platform feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      await httpClient.delete(`/reviews/${reviewId}`);

      toast.success("Review deleted successfully.");

      await fetchMyReviews();
    } catch (error) {
      console.error("Delete review error:", error);

      toast.error(error?.response?.data?.message || "Failed to delete review.");
    }
  };

  const myPlatformReviews = reviews.filter((r) => r.reviewType === "PLATFORM");

  const myProfessionalRatings = reviews.filter(
    (r) => r.reviewType === "PROFESSIONAL",
  );

  return (
    <UserLayout>
      <div className="min-h-screen bg-transparent pb-20 font-sans">
        {/* Header */}
        <div className="border-b border-brand-light/50 bg-surface/80 px-4 py-6 backdrop-blur-xl sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <span className="inline-flex rounded-full border border-brand-light bg-brand-light/30 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
              Reviews & Ratings
            </span>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
              Platform Reviews & Professional Ratings
            </h1>

            <p className="mt-2 text-sm font-medium text-gray-500">
              Share your feedback about the PoseFit website and view your
              ratings for fitness professionals.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="mx-auto mt-6 flex max-w-6xl gap-3 overflow-x-auto border-b border-brand-light/40 pb-px sm:mt-8">
            <button
              onClick={() => setActiveTab("platform")}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-bold transition-all sm:px-4 sm:text-sm ${
                activeTab === "platform"
                  ? "border-brand text-brand-dark font-extrabold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <IconStar
                className={`h-4 w-4 ${
                  activeTab === "platform" ? "text-brand-dark" : "text-gray-400"
                }`}
              />
              PoseFit Platform Reviews
              <span className="ml-1.5 rounded-full bg-brand-light/30 px-2 py-0.5 text-xs text-brand-dark">
                {myPlatformReviews.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("professional")}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-bold transition-all sm:px-4 sm:text-sm ${
                activeTab === "professional"
                  ? "border-brand text-brand-dark font-extrabold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <IconStar
                className={`h-4 w-4 ${
                  activeTab === "professional"
                    ? "text-brand-dark"
                    : "text-accent-orange-dark"
                }`}
              />
              My Professional Ratings
              <span className="ml-1.5 rounded-full bg-brand-light/30 px-2 py-0.5 text-xs text-brand-dark">
                {myProfessionalRatings.length}
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* TAB 1: PLATFORM REVIEWS */}
          {activeTab === "platform" && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Form card */}
              <div className="lg:col-span-5">
                <div className="rounded-card border border-brand-light/60 bg-surface/80 p-6 shadow-card backdrop-blur-xl">
                  <div className="flex items-center gap-2 border-b border-brand-light/40 pb-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-btn bg-brand-light/40 text-brand-dark text-sm font-black">
                      ★
                    </span>

                    <div>
                      <h2 className="text-base font-bold text-gray-800">
                        Review PoseFit Platform
                      </h2>

                      <p className="text-xs text-gray-400">
                        Help us improve your workout & diet experience.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handlePlatformSubmit}
                    className="mt-5 space-y-5"
                  >
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Your Star Rating
                      </label>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setPlatformRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 text-2xl transition-transform hover:scale-110 focus:outline-none"
                          >
                            <span
                              className={
                                star <= (hoverRating || platformRating)
                                  ? "text-amber-400 drop-shadow-xs"
                                  : "text-gray-200"
                              }
                            >
                              ★
                            </span>
                          </button>
                        ))}

                        <span className="ml-2 rounded-btn bg-brand-light/25 px-2.5 py-1 text-xs font-bold text-brand-dark">
                          {RATING_LABELS[hoverRating || platformRating]}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Your Review & Comments
                      </label>

                      <textarea
                        rows={4}
                        value={platformComment}
                        onChange={(e) => setPlatformComment(e.target.value)}
                        placeholder="Tell us what you love or how we can make PoseFit even better..."
                        maxLength={1000}
                        required
                        className="mt-2 w-full resize-none rounded-btn border border-gray-200 bg-white/60 p-3.5 text-xs font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:bg-white/80 focus:ring-2 focus:ring-brand-light/60"
                      />

                      <p className="mt-1 text-right text-[10px] text-gray-400">
                        {platformComment.length}/1000 characters
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full py-3.5 shadow-card hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Platform Review"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Platform Reviews list */}
              <div className="space-y-6 lg:col-span-7">
                {/* My Platform reviews */}
                <div className="rounded-card border border-brand-light/60 bg-surface/80 p-6 shadow-card backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-brand-light/40 pb-4">
                    <h2 className="text-base font-bold text-gray-800">
                      My Submitted Platform Reviews
                    </h2>

                    <span className="rounded-full border border-brand-light bg-brand-light/25 px-3 py-1 text-xs font-extrabold text-brand-dark">
                      {myPlatformReviews.length} submitted
                    </span>
                  </div>

                  {loading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-light border-t-brand" />
                    </div>
                  ) : myPlatformReviews.length === 0 ? (
                    <div className="py-10 text-center text-xs font-medium text-gray-400">
                      You haven't submitted any platform reviews yet.
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-brand-light/30">
                      {myPlatformReviews.map((item) => (
                        <div
                          key={item._id}
                          className="py-3.5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <div className="flex text-sm text-amber-400">
                                  {[...Array(5)].map((_, i) => (
                                    <span
                                      key={i}
                                      className={
                                        i < item.rating
                                          ? "text-amber-400"
                                          : "text-gray-200"
                                      }
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>

                                <span className="text-xs font-extrabold text-gray-800">
                                  {item.rating}.0
                                </span>
                              </div>

                              <p className="mt-1.5 text-xs font-medium leading-relaxed text-gray-700">
                                {item.comment}
                              </p>

                              <p className="mt-1.5 text-[11px] font-semibold text-gray-400">
                                {new Date(item.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </p>
                            </div>

                            <button
                              onClick={() => handleDeleteReview(item._id)}
                              title="Delete feedback"
                              className="rounded-btn border border-gray-200 p-2 text-gray-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Community platform reviews */}
                <div className="rounded-card border border-brand-light/60 bg-surface/80 p-6 shadow-card backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-brand-light/40 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-gray-800">
                        Community Platform Reviews
                      </h2>

                      <p className="text-xs text-gray-400">
                        What other athletes and users are saying about PoseFit.
                      </p>
                    </div>

                    <span className="rounded-full border border-accent-blue bg-accent-blue/40 px-3 py-1 text-xs font-extrabold text-gray-700">
                      {publicPlatformReviews.length} reviews
                    </span>
                  </div>

                  {publicPlatformReviews.length === 0 ? (
                    <div className="py-8 text-center text-xs font-medium text-gray-400">
                      No public platform reviews available yet.
                    </div>
                  ) : (
                    <div className="mt-4 max-h-96 divide-y divide-brand-light/30 overflow-y-auto">
                      {publicPlatformReviews.map((item) => (
                        <div
                          key={item._id}
                          className="py-3.5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-btn bg-brand-light/40 text-xs font-black text-brand-dark">
                                {item.user?.firstName?.[0]?.toUpperCase() ||
                                  "U"}
                              </div>

                              <p className="text-xs font-bold text-gray-800">
                                {item.user
                                  ? `${item.user.firstName} ${item.user.lastName}`
                                  : "PoseFit User"}
                              </p>
                            </div>

                            <div className="flex text-xs text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    i < item.rating
                                      ? "text-amber-400"
                                      : "text-gray-200"
                                  }
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>

                          <p className="mt-2 text-xs font-medium leading-relaxed text-gray-700">
                            "{item.comment}"
                          </p>

                          <p className="mt-1 text-[10px] text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFESSIONAL RATINGS */}
          {activeTab === "professional" && (
            <div className="space-y-6">
              {/* Already rated sessions */}
              <div className="rounded-card border border-brand-light/60 bg-surface/80 p-6 shadow-card backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-brand-light/40 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">
                      Your Rated Professional Sessions
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-400">
                      Professional reviews are star ratings submitted after
                      completed sessions.
                    </p>
                  </div>

                  <span className="rounded-full border border-brand-light bg-brand-light/25 px-3 py-1 text-xs font-extrabold text-brand-dark">
                    {myProfessionalRatings.length} rated sessions
                  </span>
                </div>

                {loading ? (
                  <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand" />
                  </div>
                ) : myProfessionalRatings.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-card bg-brand-light/25 text-2xl text-brand-dark">
                      ★
                    </div>

                    <p className="font-bold text-gray-700">
                      No rated sessions yet
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Ratings become available after your booked sessions have
                      ended.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {myProfessionalRatings.map((item) => {
                      const proName = item.professional
                        ? `${item.professional.firstName} ${item.professional.lastName}`
                        : "Fitness Professional";

                      return (
                        <div
                          key={item._id}
                          className="rounded-card border border-brand-light/40 bg-surface/60 p-5 transition-all hover:-translate-y-0.5 hover:bg-surface hover:shadow-card"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-brand text-sm font-black text-white shadow-card">
                                {item.professional?.firstName?.[0]?.toUpperCase() ||
                                  "P"}
                              </div>

                              <div>
                                <h3 className="text-sm font-black text-gray-800">
                                  {proName}
                                </h3>

                                <p className="text-xs font-bold text-brand-dark">
                                  {item.professional?.specialization ||
                                    "Certified Professional"}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteReview(item._id)}
                              title="Delete rating"
                              className="rounded-btn border border-gray-200 p-2 text-gray-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Stars */}
                          <div className="mt-3.5 flex items-center gap-2">
                            <div className="flex text-sm text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    i < item.rating
                                      ? "text-amber-400"
                                      : "text-gray-200"
                                  }
                                >
                                  ★
                                </span>
                              ))}
                            </div>

                            <span className="text-xs font-extrabold text-gray-800">
                              {item.rating}.0 / 5.0
                            </span>
                          </div>

                          {/* Session & Date info */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-brand-light/30 pt-3 text-[11px] font-medium text-gray-400">
                            <span className="flex items-center gap-1 font-bold text-brand-dark">
                              <IconCheckCircle className="h-3.5 w-3.5 text-brand" />
                              Session Verified (
                              {item.payment?.appointmentDay || "Completed"})
                            </span>

                            <span>
                              {new Date(item.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
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
    </UserLayout>
  );
}
