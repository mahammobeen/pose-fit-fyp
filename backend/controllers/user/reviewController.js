const UserModel = require("../../models/userModel");

const addReview = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { rating, comment } = req.body;

    // Check logged-in user
      if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Validate rating
    if (rating === undefined || rating === null || rating === "") {
      return res.status(400).json({
        success: false,
        message: "Rating is required",
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5",
      });
    }

    // Validate comment
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment is required",
      });
    }

    if (comment.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 500 characters",
      });
    }

    // Find user
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create review
     const newReview = {
      rating: numericRating,
      comment: comment.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add review to user's reviews
  if (!user.reviews) {
      user.reviews = [];
    }

    user.reviews.push(newReview);

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: user.reviews[user.reviews.length - 1],
    });
  } catch (error) {
    console.error("Add review error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while adding review",
    });
  }
};

// GET ALL WEBSITE REVIEWS
// Public reviews
const getAllReviews = async (req, res) => {
  try {
    const users = await UserModel.find({
      reviews: {
        $exists: true,
        $ne: [],
      },
    }).select("firstName lastName profilePhoto reviews");

    const reviews = [];

    users.forEach((user) => {
      user.reviews.forEach((review) => {
        reviews.push({
          _id: review._id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,

          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePhoto: user.profilePhoto || null,
          },
        });
      });
    });

    // Newest reviews first
    reviews.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching reviews",
    });
  }
};

// GET LOGGED-IN USER'S REVIEWS
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const user = await UserModel.findById(userId).select(
      "firstName lastName reviews",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      count: user.reviews?.length || 0,
      reviews: user.reviews || [],
    });
  } catch (error) {
    console.error("Get my reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching your reviews",
    });
  }
};

// UPDATE REVIEW
// User apna existing review update kar sakta hai
const updateReview = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const review = user.reviews.id(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Validate rating
    if (rating !== undefined) {
      const numericRating = Number(rating);

      if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message: "Rating must be a number between 1 and 5",
        });
      }

      review.rating = numericRating;
    }

    // Validate comment
     if (comment !== undefined) {
      if (!comment.trim()) {
        return res.status(400).json({
          success: false,
          message: "Comment cannot be empty",
        });
      }

      if (comment.trim().length > 500) {
        return res.status(400).json({
          success: false,
          message: "Comment cannot exceed 500 characters",
        });
      }

      review.comment = comment.trim();
    }

    review.updatedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    console.error("Update review error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while updating review",
    });
  }
};

// DELETE REVIEW
const deleteReview = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { reviewId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const review = user.reviews.id(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.deleteOne();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting review",
    });
  }
};

module.exports = {
  addReview,
  getAllReviews,
  getMyReviews,
  updateReview,
  deleteReview,
};
