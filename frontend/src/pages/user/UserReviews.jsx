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
        error?.response?.data?.message || "Failed to submit platform feedback."
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
      toast.error(
        error?.response?.data?.message || "Failed to delete review."
      );
    }
  };

  const myPlatformReviews = reviews.filter((r) => r.reviewType === "PLATFORM");
  const myProfessionalRatings = reviews.filter(
    (r) => r.reviewType === "PROFESSIONAL"
  );

  return (
    <UserLayout>
      <div className="min-h-screen bg-stone-50 pb-20">
        {/* Header */}
        <div className="border-b border-stone-200 bg-white px-8 py-8">
          <div className="max-w-6xl">
            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-emerald-800">
              Reviews & Ratings
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
              Platform Reviews & Professional Ratings
            </h1>
            <p className="mt-1 text-sm font-medium text-stone-500">
              Share your feedback about the PoseFit website and view your ratings for fitness professionals.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-3 border-b border-stone-100 pb-px">
            <button
              onClick={() => setActiveTab("platform")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
                activeTab === "platform"
                  ? "border-emerald-600 text-emerald-700 font-black"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <IconStar className="h-4 w-4 text-emerald-600" />
              PoseFit Platform Reviews
              <span className="ml-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {myPlatformReviews.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("professional")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
                activeTab === "professional"
                  ? "border-emerald-600 text-emerald-700 font-black"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <IconStar className="h-4 w-4 text-amber-500" />
              My Professional Ratings
              <span className="ml-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {myProfessionalRatings.length}
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-8 py-8">
          {/* TAB 1: PLATFORM REVIEWS */}
          {activeTab === "platform" && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Form card */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm">
                      ★
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">
                        Review PoseFit Platform
                      </h2>
                      <p className="text-xs text-stone-400">
                        Help us improve your workout & diet experience.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handlePlatformSubmit} className="mt-5 space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                        Your Star Rating
                      </label>
                      <div className="mt-2 flex items-center gap-2">
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
                                  : "text-stone-200"
                              }
                            >
                              ★
                            </span>
                          </button>
                        ))}
                        <span className="ml-2 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                          {RATING_LABELS[hoverRating || platformRating]}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                        Your Review & Comments
                      </label>
                      <textarea
                        rows={4}
                        value={platformComment}
                        onChange={(e) => setPlatformComment(e.target.value)}
                        placeholder="Tell us what you love or how we can make PoseFit even better..."
                        maxLength={1000}
                        required
                        className="mt-2 w-full resize-none rounded-2xl border border-stone-200 p-3.5 text-xs font-medium text-stone-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                      <p className="mt-1 text-right text-[10px] text-stone-400">
                        {platformComment.length}/1000 characters
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                      style={{
                        background:
                          "linear-gradient(135deg, #10b981, #059669)",
                      }}
                    >
                      {submitting ? "Submitting..." : "Submit Platform Review"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Platform Reviews list */}
              <div className="lg:col-span-7 space-y-6">
                {/* My Platform reviews */}
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <h2 className="text-base font-bold text-stone-900">
                      My Submitted Platform Reviews
                    </h2>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                      {myPlatformReviews.length} submitted
                    </span>
                  </div>

                  {loading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
                    </div>
                  ) : myPlatformReviews.length === 0 ? (
                    <div className="py-10 text-center text-stone-400 font-medium text-xs">
                      You haven't submitted any platform reviews yet.
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-stone-100">
                      {myPlatformReviews.map((item) => (
                        <div key={item._id} className="py-3.5 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <div className="flex text-amber-400 text-sm">
                                  {[...Array(5)].map((_, i) => (
                                    <span
                                      key={i}
                                      className={
                                        i < item.rating
                                          ? "text-amber-400"
                                          : "text-stone-200"
                                      }
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-xs font-extrabold text-stone-800">
                                  {item.rating}.0
                                </span>
                              </div>

                              <p className="mt-1.5 text-xs font-medium leading-relaxed text-stone-700">
                                {item.comment}
                              </p>

                              <p className="mt-1.5 text-[11px] font-semibold text-stone-400">
                                {new Date(item.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>

                            <button
                              onClick={() => handleDeleteReview(item._id)}
                              title="Delete feedback"
                              className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
                <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-stone-900">
                        Community Platform Reviews
                      </h2>
                      <p className="text-xs text-stone-400">
                        What other athletes and users are saying about PoseFit.
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800 border border-blue-200">
                      {publicPlatformReviews.length} reviews
                    </span>
                  </div>

                  {publicPlatformReviews.length === 0 ? (
                    <div className="py-8 text-center text-stone-400 font-medium text-xs">
                      No public platform reviews available yet.
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-stone-100 max-h-96 overflow-y-auto">
                      {publicPlatformReviews.map((item) => (
                        <div key={item._id} className="py-3.5 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                                {item.user?.firstName?.[0]?.toUpperCase() || "U"}
                              </div>
                              <p className="text-xs font-bold text-stone-800">
                                {item.user
                                  ? `${item.user.firstName} ${item.user.lastName}`
                                  : "PoseFit User"}
                              </p>
                            </div>

                            <div className="flex text-amber-400 text-xs">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    i < item.rating
                                      ? "text-amber-400"
                                      : "text-stone-200"
                                  }
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>

                          <p className="mt-2 text-xs font-medium leading-relaxed text-stone-700">
                            "{item.comment}"
                          </p>

                          <p className="mt-1 text-[10px] text-stone-400">
                            {new Date(item.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
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
              <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-stone-900">
                      Your Rated Professional Sessions
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Professional reviews are star ratings submitted after completed sessions.
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                    {myProfessionalRatings.length} rated sessions
                  </span>
                </div>

                {loading ? (
                  <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
                  </div>
                ) : myProfessionalRatings.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 text-2xl">
                      ★
                    </div>
                    <p className="font-bold text-stone-700">
                      No rated sessions yet
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      Ratings become available after your booked sessions have ended.
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
                          className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 transition-all hover:bg-white hover:shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white shadow-xs"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #10b981, #059669)",
                                }}
                              >
                                {item.professional?.firstName?.[0]?.toUpperCase() ||
                                  "P"}
                              </div>

                              <div>
                                <h3 className="text-sm font-black text-stone-800">
                                  {proName}
                                </h3>
                                <p className="text-xs font-bold text-emerald-700">
                                  {item.professional?.specialization ||
                                    "Certified Professional"}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteReview(item._id)}
                              title="Delete rating"
                              className="rounded-xl border border-stone-200 p-2 text-stone-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Stars */}
                          <div className="mt-3.5 flex items-center gap-2">
                            <div className="flex text-amber-400 text-sm">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    i < item.rating
                                      ? "text-amber-400"
                                      : "text-stone-200"
                                  }
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-xs font-extrabold text-stone-800">
                              {item.rating}.0 / 5.0
                            </span>
                          </div>

                          {/* Session & Date info */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/60 pt-3 text-[11px] text-stone-400 font-medium">
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <IconCheckCircle className="h-3.5 w-3.5 text-emerald-600" />
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
                                }
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
