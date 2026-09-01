const mongoose = require("mongoose");
const ReviewModel = require("../../models/reviewsModel");
const PaymentModel = require("../../models/paymentModel");
const UserModel = require("../../models/userModel");

// Helper: Calculate if a scheduled session's end time has passed
const hasSessionEnded = (appointmentDate, appointmentSlot, sessionDuration = 1) => {
  if (!appointmentDate || !appointmentSlot) return false;

  const dateObj = new Date(appointmentDate);
  if (Number.isNaN(dateObj.getTime())) return false;

  const slotText = String(appointmentSlot).trim();

  // Try parsing formats like "03:00 PM - 04:00 PM" or "03:00 PM"
  const parts = slotText.split(/\s*-\s*/);
  const startPart = parts[0] ? parts[0].trim() : "";
  const endPart = parts[1] ? parts[1].trim() : "";

  const startMatch = startPart.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  const endMatch = endPart ? endPart.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i) : null;

  if (!startMatch) {
    return dateObj <= new Date();
  }

  let startHours = Number(startMatch[1]);
  const startMinutes = Number(startMatch[2] || 0);
  const startMeridiem = startMatch[3]?.toUpperCase();

  if (startMeridiem === "PM" && startHours !== 12) {
    startHours += 12;
  }
  if (startMeridiem === "AM" && startHours === 12) {
    startHours = 0;
  }

  const startTime = new Date(dateObj);
  startTime.setHours(startHours, startMinutes, 0, 0);

  let endTime;

  if (endMatch) {
    let endHours = Number(endMatch[1]);
    const endMinutes = Number(endMatch[2] || 0);
    let endMeridiem = endMatch[3]?.toUpperCase();

    if (!endMeridiem && startMeridiem) {
      endMeridiem = startMeridiem;
    }

    if (endMeridiem === "PM" && endHours !== 12) {
      endHours += 12;
    }
    if (endMeridiem === "AM" && endHours === 12) {
      endHours = 0;
    }

    endTime = new Date(dateObj);
    endTime.setHours(endHours, endMinutes, 0, 0);

    if (endTime <= startTime) {
      endTime.setHours(endTime.getHours() + (Number(sessionDuration) || 1));
    }
  } else {
    const duration = Number(sessionDuration) || 1;
    endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + duration);
  }

  return endTime <= new Date();
};

// Helper: Recalculate professional rating
const recalculateProfessionalRating = async (professionalId) => {
  if (!professionalId || !mongoose.Types.ObjectId.isValid(professionalId)) {
    return { averageRating: 0, ratingCount: 0 };
  }

  const ratingResult = await ReviewModel.aggregate([
    {
      $match: {
        reviewType: "PROFESSIONAL",
        professional: new mongoose.Types.ObjectId(professionalId),
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$professional",
        averageRating: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating = ratingResult.length
    ? Number(ratingResult[0].averageRating.toFixed(1))
    : 0;

  const ratingCount = ratingResult.length
    ? ratingResult[0].ratingCount
    : 0;

  await UserModel.findByIdAndUpdate(professionalId, {
    $set: {
      "rating.average": averageRating,
      "rating.count": ratingCount,
    },
  });

  return { averageRating, ratingCount };
};

// 1. Create Review (Platform Review or Professional Rating)
const createReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      reviewType,
      professionalId,
      paymentId,
      rating,
      comment,
    } = req.body;

    if (rating === undefined || rating === null) {
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
        message: "Rating must be a whole number between 1 and 5",
      });
    }

    // Determine type: explicitly provided or derived from paymentId
    let type = reviewType ? reviewType.toUpperCase() : null;
    if (!type) {
      type = paymentId ? "PROFESSIONAL" : "PLATFORM";
    }

    // ========================================================
    // A. PLATFORM REVIEW
    // ========================================================
    if (type === "PLATFORM") {
      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          message: "A written comment is required for platform reviews",
        });
      }

      // Do NOT set payment or professional keys to avoid duplicate key issues
      const review = await ReviewModel.create({
        user: userId,
        reviewType: "PLATFORM",
        rating: numericRating,
        comment: comment.trim(),
      });

      const populatedReview = await ReviewModel.findById(review._id).populate(
        "user",
        "firstName lastName email profilePhoto"
      );

      return res.status(201).json({
        success: true,
        message: "Platform review submitted successfully",
        review: populatedReview,
      });
    }

    // ========================================================
    // B. PROFESSIONAL RATING (Only rating, no comments, requires completed past session)
    // ========================================================
    let targetProfessionalId = professionalId || req.body.professionalId;
    let verifiedPayment = null;

    if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
      verifiedPayment = await PaymentModel.findOne({
        _id: paymentId,
        user: userId,
        status: "completed",
      });

      if (verifiedPayment && verifiedPayment.professional) {
        targetProfessionalId = verifiedPayment.professional;
      }
    }

    if (!targetProfessionalId && !verifiedPayment) {
      return res.status(400).json({
        success: false,
        message: "Professional ID or booking session ID is required",
      });
    }

    // Check if user has already rated this professional overall
    const existingReview = await ReviewModel.findOne({
      user: userId,
      professional: targetProfessionalId,
      reviewType: "PROFESSIONAL",
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already rated this professional.",
      });
    }

    // If verifiedPayment is not yet resolved, find user's completed ended session with this professional
    if (!verifiedPayment) {
      const payments = await PaymentModel.find({
        user: userId,
        professional: targetProfessionalId,
        status: "completed",
        appointmentDate: { $exists: true, $ne: null },
      }).sort({ appointmentDate: 1, createdAt: 1 });

      verifiedPayment = payments.find((p) =>
        hasSessionEnded(
          p.appointmentDate,
          p.appointmentSlot,
          p.sessionDuration || 1
        )
      );
    }

    if (!verifiedPayment) {
      return res.status(400).json({
        success: false,
        message:
          "You can rate this professional after completing a scheduled session whose time has ended.",
      });
    }

    // Verify session end time has passed
    const sessionEnded = hasSessionEnded(
      verifiedPayment.appointmentDate,
      verifiedPayment.appointmentSlot,
      verifiedPayment.sessionDuration || 1
    );

    if (!sessionEnded) {
      return res.status(400).json({
        success: false,
        message:
          "You can rate your professional after the scheduled session time has ended.",
      });
    }

    // Professional reviews are ONLY ratings, no written comments
    const review = await ReviewModel.create({
      user: userId,
      reviewType: "PROFESSIONAL",
      professional: verifiedPayment.professional,
      payment: verifiedPayment._id,
      rating: numericRating,
      comment: "",
    });

    // Recalculate professional rating in UserModel
    const { averageRating, ratingCount } =
      await recalculateProfessionalRating(verifiedPayment.professional);

    const populatedReview = await ReviewModel.findById(review._id)
      .populate("user", "firstName lastName email profilePhoto")
      .populate(
        "professional",
        "firstName lastName specialization profilePhoto"
      );

    return res.status(201).json({
      success: true,
      message: "Professional rating submitted successfully",
      review: populatedReview,
      averageRating,
      ratingCount,
    });
  } catch (error) {
    console.error("Create review error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to submit review",
    });
  }
};

// 2. Get Pending Unrated Professionals for Logged-In User (Only once per professional)
const getPendingRatings = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find all completed sessions for this user sorted chronologically (first session first)
    const completedPayments = await PaymentModel.find({
      user: userId,
      status: "completed",
      professional: { $exists: true, $ne: null },
      appointmentDate: { $exists: true, $ne: null },
    })
      .populate(
        "professional",
        "firstName lastName email specialization professionalType profilePhoto sessionFee"
      )
      .sort({ appointmentDate: 1, createdAt: 1 });

    // Find all professionals already rated by this user
    const userRatings = await ReviewModel.find({
      user: userId,
      reviewType: "PROFESSIONAL",
    }).select("professional");

    const ratedProfessionalIds = new Set(
      userRatings
        .filter((r) => r.professional)
        .map((r) => r.professional.toString())
    );

    // Group by professional and keep ONLY the first completed session for unrated professionals
    const unratedProfessionalsMap = new Map();

    for (const payment of completedPayments) {
      if (!payment.professional?._id) continue;
      const proId = payment.professional._id.toString();

      // If user already rated this professional, skip completely
      if (ratedProfessionalIds.has(proId)) continue;

      // Keep only the first completed session for this unrated professional
      if (
        !unratedProfessionalsMap.has(proId) &&
        hasSessionEnded(
          payment.appointmentDate,
          payment.appointmentSlot,
          payment.sessionDuration || 1
        )
      ) {
        unratedProfessionalsMap.set(proId, payment);
      }
    }

    const pendingSessions = Array.from(unratedProfessionalsMap.values());

    return res.status(200).json({
      success: true,
      count: pendingSessions.length,
      pendingSessions,
    });
  } catch (error) {
    console.error("Get pending ratings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch pending ratings",
    });
  }
};

// 3. Get Professional Rating Summary & Ratings
const getProfessionalReviews = async (req, res) => {
  try {
    const { professionalId } = req.params;

    if (!professionalId || !mongoose.Types.ObjectId.isValid(professionalId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid professional ID",
      });
    }

    const reviews = await ReviewModel.find({
      reviewType: "PROFESSIONAL",
      professional: professionalId,
      isDeleted: { $ne: true },
    })
      .populate("user", "firstName lastName profilePhoto")
      .sort({ createdAt: -1 });

    const ratingResult = await ReviewModel.aggregate([
      {
        $match: {
          reviewType: "PROFESSIONAL",
          professional: new mongoose.Types.ObjectId(professionalId),
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$professional",
          averageRating: { $avg: "$rating" },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    const averageRating = ratingResult.length
      ? Number(ratingResult[0].averageRating.toFixed(1))
      : 0;

    const ratingCount = ratingResult.length
      ? ratingResult[0].ratingCount
      : 0;

    return res.status(200).json({
      success: true,
      averageRating,
      ratingCount,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get professional reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch professional reviews",
    });
  }
};

// 4. Get Public Platform Reviews
const getPlatformReviews = async (req, res) => {
  try {
    const reviews = await ReviewModel.find({
      reviewType: "PLATFORM",
      isDeleted: { $ne: true },
    })
      .populate("user", "firstName lastName profilePhoto")
      .sort({ createdAt: -1 });

    const ratingResult = await ReviewModel.aggregate([
      {
        $match: {
          reviewType: "PLATFORM",
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    const averageRating = ratingResult.length
      ? Number(ratingResult[0].averageRating.toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating,
      reviews,
    });
  } catch (error) {
    console.error("Get platform reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch platform reviews",
    });
  }
};

// 5. Get Current User's Submitted Reviews (Platform & Professional)
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reviews = await ReviewModel.find({
      user: userId,
      isDeleted: { $ne: true },
    })
      .populate(
        "professional",
        "firstName lastName specialization profilePhoto"
      )
      .populate(
        "payment",
        "amount appointmentDate appointmentDay appointmentSlot sessionDuration"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get my reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your reviews",
    });
  }
};

// 6. Get Booking Review Status
const getPaymentReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentId } = req.params;

    const review = await ReviewModel.findOne({
      user: userId,
      payment: paymentId,
      isDeleted: { $ne: true },
    });

    return res.status(200).json({
      success: true,
      reviewed: !!review,
      review: review || null,
    });
  } catch (error) {
    console.error("Get payment review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check review status",
    });
  }
};

// 7. Get All Reviews for Admin (Professional & Platform)
const getAllReviews = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { isDeleted: { $ne: true } };

    if (
      type &&
      ["PROFESSIONAL", "PLATFORM"].includes(type.toUpperCase())
    ) {
      query.reviewType = type.toUpperCase();
    }

    const reviews = await ReviewModel.find(query)
      .populate("user", "firstName lastName email profilePhoto")
      .populate(
        "professional",
        "firstName lastName specialization email profilePhoto"
      )
      .populate(
        "payment",
        "amount appointmentDate appointmentDay appointmentSlot"
      )
      .sort({ createdAt: -1 });

    const totalCount = await ReviewModel.countDocuments({
      isDeleted: { $ne: true },
    });
    const platformCount = await ReviewModel.countDocuments({
      reviewType: "PLATFORM",
      isDeleted: { $ne: true },
    });
    const professionalCount = await ReviewModel.countDocuments({
      reviewType: "PROFESSIONAL",
      isDeleted: { $ne: true },
    });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      totalCount,
      platformCount,
      professionalCount,
      reviews,
    });
  } catch (error) {
    console.error("Get all reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch reviews",
    });
  }
};

// 8. Delete Review (Admin or Owner) -> SOFT DELETE ONLY
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const review = await ReviewModel.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Review is already deleted",
      });
    }

    // Check authorization: Admin or Review Owner
    const isOwner = review.user.toString() === userId.toString();
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this review",
      });
    }

    const professionalId = review.professional;
    const isProfessionalReview = review.reviewType === "PROFESSIONAL";

    // SOFT DELETE: Preserve document in MongoDB, mark as isDeleted: true
    await ReviewModel.findByIdAndUpdate(id, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // If professional review, recalculate professional's average from remaining active ratings
    if (isProfessionalReview && professionalId) {
      await recalculateProfessionalRating(professionalId);
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete review",
    });
  }
};

module.exports = {
  createReview,
  getPendingRatings,
  getProfessionalReviews,
  getProfessionalRating: getProfessionalReviews, // Backwards compatibility
  getPlatformReviews,
  getMyReviews,
  getPaymentReview,
  getAllReviews,
  deleteReview,
};

