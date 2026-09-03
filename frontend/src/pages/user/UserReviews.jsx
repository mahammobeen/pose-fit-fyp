import { useEffect, useState } from "react";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";
import Link from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
const UserReviews = () => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const [reviews, setReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);

  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);

  // =====================================================
  // GET ALL REVIEWS
  // =====================================================

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);

      const res = await httpClient.get("/user/reviews/all");

      if (res.data?.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (error) {
      console.error("Fetch reviews error:", error);

      toast.error(error?.response?.data?.message || "Failed to load reviews.");
    } finally {
      setReviewsLoading(false);
    }
  };

  // =====================================================
  // GET MY REVIEWS
  // =====================================================

  const fetchMyReviews = async () => {
    const token = localStorage.getItem("pose-fit");

    if (!token) return;

    try {
      const res = await httpClient.get("/user/reviews/my");

      if (res.data?.success) {
        setMyReviews(res.data.reviews || []);
      }
    } catch (error) {
      console.error("Fetch my reviews error:", error);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchReviews();
    fetchMyReviews();
  }, []);

  // =====================================================
  // ADD / UPDATE REVIEW
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating) {
      toast.error("Please select a rating.");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write a comment.");
      return;
    }

    if (comment.trim().length > 500) {
      toast.error("Comment cannot exceed 500 characters.");
      return;
    }

    const token = localStorage.getItem("pose-fit");

    if (!token) {
      toast.error("Please login to submit a review.");
      return;
    }

    setLoading(true);

    try {
      // =================================================
      // UPDATE
      // =================================================

      if (editingId) {
        const res = await httpClient.put(`/user/update/reviews/${editingId}`, {
          rating,
          comment: comment.trim(),
        });

        if (res.data?.success) {
          toast.success("Review updated successfully.");

          setRating(0);
          setHoverRating(0);
          setComment("");
          setEditingId(null);

          await fetchReviews();
          await fetchMyReviews();
        }

        return;
      }

      // =================================================
      // ADD
      // =================================================

      const res = await httpClient.post("/user/review/add", {
        rating,
        comment: comment.trim(),
      });

      if (res.data?.success) {
        toast.success("Review added successfully.");

        setRating(0);
        setHoverRating(0);
        setComment("");

        await fetchReviews();
        await fetchMyReviews();
      }
    } catch (error) {
      console.error("Review submit error:", error);

      toast.error(error?.response?.data?.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // EDIT REVIEW
  // =====================================================

  const handleEdit = (review) => {
    setEditingId(review._id);
    setRating(review.rating);
    setComment(review.comment);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // CANCEL EDIT
  // =====================================================

  const handleCancelEdit = () => {
    setEditingId(null);
    setRating(0);
    setHoverRating(0);
    setComment("");
  };

  // =====================================================
  // DELETE REVIEW
  // =====================================================

  const handleDelete = async (reviewId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this review?",
    );

    if (!confirmed) return;

    try {
      const res = await httpClient.delete(`/user/delete/reviews/${reviewId}`);

      if (res.data?.success) {
        toast.success("Review deleted successfully.");

        await fetchReviews();
        await fetchMyReviews();
      }
    } catch (error) {
      console.error("Delete review error:", error);

      toast.error(error?.response?.data?.message || "Failed to delete review.");
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // =====================================================
  // CHECK OWN REVIEW
  // =====================================================

  const isMyReview = (reviewId) => {
    return myReviews.some((review) => review._id === reviewId);
  };

  // =====================================================
  // RENDER STARS
  // =====================================================

  const renderStars = (currentRating, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active =
            star <= (interactive ? hoverRating || rating : currentRating);

          return (
            <button
              key={star}
              type={interactive ? "button" : undefined}
              disabled={!interactive}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              onClick={() => interactive && setRating(star)}
              className={`text-2xl transition-transform ${
                interactive
                  ? "hover:scale-110 cursor-pointer"
                  : "cursor-default"
              } ${active ? "text-amber-400" : "text-stone-300"}`}
            >
              ★
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-stone-50 px-4 py-8 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* =================================================
            HEADER
        ================================================= */}

          <div className="text-center mb-10">
            <div
              className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-sm mb-4"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
            >
              P
            </div>

            <h1 className="text-3xl font-black text-stone-800">
              Share Your Experience
            </h1>

            <p className="text-sm text-stone-500 mt-2">
              Tell us what you think about PoseFit.
            </p>
          </div>

          {/* =================================================
            REVIEW FORM
        ================================================= */}

          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 md:p-8 mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-stone-800">
                  {editingId ? "Edit Your Review" : "Write a Review"}
                </h2>

                <p className="text-xs text-stone-500 mt-1">
                  Your feedback helps us improve PoseFit.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs font-bold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* RATING */}

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-3">
                  Your Rating
                </label>

                <div className="flex items-center gap-3">
                  {renderStars(rating, true)}

                  {rating > 0 && (
                    <span className="text-sm font-bold text-stone-600">
                      {rating}/5
                    </span>
                  )}
                </div>
              </div>

              {/* COMMENT */}

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                  Your Comment
                </label>

                <textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                  }}
                  maxLength={500}
                  rows={5}
                  placeholder="Write your experience with PoseFit..."
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium text-stone-800 outline-none resize-none transition-all bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-300"
                />

                <div className="flex justify-end mt-1">
                  <span className="text-[11px] text-stone-400">
                    {comment.length}/500
                  </span>
                </div>
              </div>

              {/* BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-3.5 rounded-2xl font-bold text-white text-sm shadow-md hover:opacity-95 active:scale-95 disabled:opacity-60 transition-all duration-200"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                {loading
                  ? editingId
                    ? "Updating..."
                    : "Submitting..."
                  : editingId
                  ? "Update Review"
                  : "Submit Review"}
              </button>
            </form>
          </div>

          {/* =================================================
            ALL REVIEWS
        ================================================= */}

          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-stone-800">
                  What Our Users Say
                </h2>

                <p className="text-sm text-stone-500 mt-1">
                  Feedback from the PoseFit community
                </p>
              </div>

              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold">
                {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
              </div>
            </div>

            {/* LOADING */}

            {reviewsLoading ? (
              <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center">
                <div className="w-7 h-7 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />

                <p className="text-sm text-stone-500 mt-3">
                  Loading reviews...
                </p>
              </div>
            ) : reviews.length === 0 ? (
              /* EMPTY */

              <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center">
                <div className="text-4xl mb-3">⭐</div>

                <h3 className="text-lg font-black text-stone-800">
                  No reviews yet
                </h3>

                <p className="text-sm text-stone-500 mt-1">
                  Be the first person to share your experience!
                </p>
              </div>
            ) : (
              /* REVIEWS */

              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-white rounded-3xl border border-stone-200 p-5 md:p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* USER */}

                      <div className="flex items-center gap-3">
                        {review.user?.profilePhoto ? (
                          <img
                            src={review.user.profilePhoto}
                            alt="User"
                            className="w-11 h-11 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black"
                            style={{
                              background:
                                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            }}
                          >
                            {review.user?.firstName?.charAt(0)?.toUpperCase() ||
                              "U"}
                          </div>
                        )}

                        <div>
                          <h3 className="text-sm font-black text-stone-800">
                            {review.user?.firstName} {review.user?.lastName}
                          </h3>

                          <p className="text-[11px] text-stone-400">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* RATING */}

                      {renderStars(review.rating)}
                    </div>

                    {/* COMMENT */}

                    <p className="text-sm text-stone-600 leading-6 mt-4">
                      "{review.comment}"
                    </p>

                    {/* ACTIONS */}

                    {isMyReview(review._id) && (
                      <div className="flex gap-4 mt-4 pt-4 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => handleEdit(review)}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(review._id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =================================================
            BACK TO DASHBOARD
        ================================================= */}

          <div className="text-center mt-10">
            <Link
              to="/user/dashboard"
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserReviews;
