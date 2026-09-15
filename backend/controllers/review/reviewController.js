const mongoose = require("mongoose");

const ReviewModel = require("../../models/reviewsModel");
const PaymentModel = require("../../models/paymentModel");
const UserModel = require("../../models/userModel");

const PAKISTAN_OFFSET_MS = 5 * 60 * 60 * 1000;

const hasSessionEnded = (
  appointmentDate,
  appointmentSlot,
  sessionDuration = 1
) => {
  if (!appointmentDate) {
    return false;
  }

  const dateObj = new Date(appointmentDate);

  if (Number.isNaN(dateObj.getTime())) {
    return false;
  }

  const now = new Date();

  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();
  const day = dateObj.getUTCDate();

  const todayPakistan = new Date(
    now.getTime() + PAKISTAN_OFFSET_MS
  );

  const todayYear = todayPakistan.getUTCFullYear();
  const todayMonth = todayPakistan.getUTCMonth();
  const todayDay = todayPakistan.getUTCDate();

  const appointmentDayNumber = Date.UTC(
    year,
    month,
    day
  );

  const todayDayNumber = Date.UTC(
    todayYear,
    todayMonth,
    todayDay
  );

  if (appointmentDayNumber < todayDayNumber) {
    return true;
  }

  if (appointmentDayNumber > todayDayNumber) {
    return false;
  }

  const slotText = String(
    appointmentSlot || ""
  ).trim();

  const parts = slotText.split(/\s*-\s*/);

  const startPart = parts[0]?.trim() || "";
  const endPart = parts[1]?.trim() || "";

  const parseTime = (value, fallbackMeridiem = null) => {
    const match = value.match(
      /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i
    );

    if (!match) {
      return null;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2] || 0);

    let meridiem =
      match[3]?.toUpperCase() ||
      fallbackMeridiem;

    if (
      hours < 1 ||
      hours > 12 ||
      minutes > 59
    ) {
      return null;
    }

    if (meridiem === "PM" && hours !== 12) {
      hours += 12;
    }

    if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }

    return {
      hours,
      minutes,
      meridiem,
    };
  };

  const startTime = parseTime(startPart);

  if (!startTime) {
    return false;
  }

  const endTime = endPart
    ? parseTime(
        endPart,
        startTime.meridiem
      )
    : null;

  const createPakistanDate = (
    hours,
    minutes
  ) => {
    return new Date(
      Date.UTC(
        year,
        month,
        day,
        hours,
        minutes,
        0,
        0
      ) - PAKISTAN_OFFSET_MS
    );
  };

  const startDateTime =
    createPakistanDate(
      startTime.hours,
      startTime.minutes
    );

  let sessionEndDateTime;

  if (endTime) {
    sessionEndDateTime =
      createPakistanDate(
        endTime.hours,
        endTime.minutes
      );

    if (
      sessionEndDateTime <=
      startDateTime
    ) {
      sessionEndDateTime = new Date(
        sessionEndDateTime.getTime() +
          24 * 60 * 60 * 1000
      );
    }
  } else {
    const duration =
      Number(sessionDuration) || 1;

    sessionEndDateTime = new Date(
      startDateTime.getTime() +
        duration * 60 * 60 * 1000
    );
  }

  return sessionEndDateTime <= now;
};

const recalculateProfessionalRating = async (
  professionalId
) => {
  if (
    !professionalId ||
    !mongoose.Types.ObjectId.isValid(
      professionalId
    )
  ) {
    return {
      averageRating: 0,
      ratingCount: 0,
    };
  }

  const ratingResult =
    await ReviewModel.aggregate([
      {
        $match: {
          reviewType: "PROFESSIONAL",
          professional:
            new mongoose.Types.ObjectId(
              professionalId
            ),
        },
      },
      {
        $group: {
          _id: "$professional",
          averageRating: {
            $avg: "$rating",
          },
          ratingCount: {
            $sum: 1,
          },
        },
      },
    ]);

  const averageRating = ratingResult.length
    ? Number(
        ratingResult[0].averageRating.toFixed(1)
      )
    : 0;

  const ratingCount = ratingResult.length
    ? ratingResult[0].ratingCount
    : 0;

  await UserModel.findByIdAndUpdate(
    professionalId,
    {
      $set: {
        "rating.average": averageRating,
        "rating.count": ratingCount,
      },
    }
  );

  return {
    averageRating,
    ratingCount,
  };
};

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
        message:
          "Rating must be a whole number between 1 and 5",
      });
    }

    let type = reviewType
      ? String(reviewType).toUpperCase()
      : null;

    if (!type) {
      type = paymentId
        ? "PROFESSIONAL"
        : "PLATFORM";
    }

    if (type === "PLATFORM") {
      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "A written comment is required for platform reviews",
        });
      }

      const review = await ReviewModel.create({
        user: userId,
        reviewType: "PLATFORM",
        rating: numericRating,
        comment: comment.trim(),
      });

      const populatedReview =
        await ReviewModel.findById(
          review._id
        ).populate(
          "user",
          "firstName lastName email profilePhoto"
        );

      return res.status(201).json({
        success: true,
        message:
          "Platform review submitted successfully",
        review: populatedReview,
      });
    }

    if (type !== "PROFESSIONAL") {
      return res.status(400).json({
        success: false,
        message: "Invalid review type",
      });
    }

    let targetProfessionalId =
      professionalId || req.body.professionalId;

    let verifiedPayment = null;

    if (
      paymentId &&
      mongoose.Types.ObjectId.isValid(paymentId)
    ) {
      verifiedPayment =
        await PaymentModel.findOne({
          _id: paymentId,
          user: userId,
          status: "completed",
        });

      if (verifiedPayment?.professional) {
        targetProfessionalId =
          verifiedPayment.professional;
      }
    }

    if (
      !targetProfessionalId ||
      !mongoose.Types.ObjectId.isValid(
        targetProfessionalId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Professional ID or booking session ID is required",
      });
    }

    const existingReview =
      await ReviewModel.findOne({
        user: userId,
        professional: targetProfessionalId,
        reviewType: "PROFESSIONAL",
      });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message:
          "You have already rated this professional.",
      });
    }

    if (!verifiedPayment) {
      const payments =
        await PaymentModel.find({
          user: userId,
          professional: targetProfessionalId,
          status: "completed",
          appointmentDate: {
            $exists: true,
            $ne: null,
          },
          appointmentSlot: {
            $exists: true,
            $ne: "",
          },
        }).sort({
          appointmentDate: 1,
          createdAt: 1,
        });

      verifiedPayment = payments.find(
        (payment) =>
          hasSessionEnded(
            payment.appointmentDate,
            payment.appointmentSlot,
            payment.sessionDuration || 1
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

    const sessionEnded =
      hasSessionEnded(
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

    const professionalForReview =
      verifiedPayment.professional;

    if (!professionalForReview) {
      return res.status(400).json({
        success: false,
        message:
          "Professional information is missing from this booking.",
      });
    }

    const finalExistingReview =
      await ReviewModel.findOne({
        user: userId,
        professional: professionalForReview,
        reviewType: "PROFESSIONAL",
      });

    if (finalExistingReview) {
      return res.status(409).json({
        success: false,
        message:
          "You have already rated this professional.",
      });
    }

    const review =
      await ReviewModel.create({
        user: userId,
        reviewType: "PROFESSIONAL",
        professional: professionalForReview,
        payment: verifiedPayment._id,
        rating: numericRating,
        comment:"",
      });

    const {
      averageRating,
      ratingCount,
    } =
      await recalculateProfessionalRating(
        professionalForReview
      );

    const populatedReview =
      await ReviewModel.findById(
        review._id
      )
        .populate(
          "user",
          "firstName lastName email profilePhoto"
        )
        .populate(
          "professional",
          "firstName lastName specialization profilePhoto"
        )
        .populate(
          "payment",
          "amount appointmentDate appointmentDay appointmentSlot sessionDuration"
        );

    return res.status(201).json({
      success: true,
      message:
        "Professional rating submitted successfully",
      review: populatedReview,
      averageRating,
      ratingCount,
    });
  } catch (error) {
    console.error(
      "Create review error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "You have already rated this professional.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to submit review",
    });
  }
};

const getPendingRatings = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const completedPayments =
      await PaymentModel.find({
        user: userId,
        status: "completed",
        professional: {
          $exists: true,
          $ne: null,
        },
        appointmentDate: {
          $exists: true,
          $ne: null,
        },
        appointmentSlot: {
          $exists: true,
          $ne: "",
        },
      })
        .populate(
          "professional",
          "firstName lastName email specialization professionalType profilePhoto sessionFee"
        )
        .sort({
          appointmentDate: 1,
          createdAt: 1,
        });

    const userRatings =
      await ReviewModel.find({
        user: userId,
        reviewType: "PROFESSIONAL",
        professional: {
          $exists: true,
          $ne: null,
        },
      }).select("professional");

    const ratedProfessionalIds =
      new Set(
        userRatings.map((review) =>
          review.professional.toString()
        )
      );

    const unratedProfessionalsMap =
      new Map();

    for (const payment of completedPayments) {
      if (!payment.professional?._id) {
        continue;
      }

      const professionalId =
        payment.professional._id.toString();

      if (
        ratedProfessionalIds.has(
          professionalId
        )
      ) {
        continue;
      }

      const sessionEnded =
        hasSessionEnded(
          payment.appointmentDate,
          payment.appointmentSlot,
          payment.sessionDuration || 1
        );

      if (!sessionEnded) {
        continue;
      }

      if (
        !unratedProfessionalsMap.has(
          professionalId
        )
      ) {
        unratedProfessionalsMap.set(
          professionalId,
          payment
        );
      }
    }

    const pendingSessions =
      Array.from(
        unratedProfessionalsMap.values()
      );

    return res.status(200).json({
      success: true,
      count: pendingSessions.length,
      pendingSessions,
    });
  } catch (error) {
    console.error(
      "Get pending ratings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch pending ratings",
    });
  }
};

const getProfessionalReviews = async (
  req,
  res
) => {
  try {
    const { professionalId } =
      req.params;

    if (
      !professionalId ||
      !mongoose.Types.ObjectId.isValid(
        professionalId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid professional ID",
      });
    }

    const reviews =
      await ReviewModel.find({
        reviewType: "PROFESSIONAL",
        professional: professionalId,
      })
        .populate(
          "user",
          "firstName lastName profilePhoto"
        )
        .sort({
          createdAt: -1,
        });

    const ratingResult =
      await ReviewModel.aggregate([
        {
          $match: {
            reviewType: "PROFESSIONAL",
            professional:
              new mongoose.Types.ObjectId(
                professionalId
              ),
          },
        },
        {
          $group: {
            _id: "$professional",
            averageRating: {
              $avg: "$rating",
            },
            ratingCount: {
              $sum: 1,
            },
          },
        },
      ]);

    const averageRating =
      ratingResult.length
        ? Number(
            ratingResult[0].averageRating.toFixed(
              1
            )
          )
        : 0;

    const ratingCount =
      ratingResult.length
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
    console.error(
      "Get professional reviews error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch professional reviews",
    });
  }
};

const getPlatformReviews = async (
  req,
  res
) => {
  try {
    const reviews =
      await ReviewModel.find({
        reviewType: "PLATFORM",
      })
        .populate(
          "user",
          "firstName lastName profilePhoto"
        )
        .sort({
          createdAt: -1,
        });

    const ratingResult =
      await ReviewModel.aggregate([
        {
          $match: {
            reviewType: "PLATFORM",
          },
        },
        {
          $group: {
            _id: null,
            averageRating: {
              $avg: "$rating",
            },
            ratingCount: {
              $sum: 1,
            },
          },
        },
      ]);

    const averageRating =
      ratingResult.length
        ? Number(
            ratingResult[0].averageRating.toFixed(
              1
            )
          )
        : 0;

    const ratingCount =
      ratingResult.length
        ? ratingResult[0].ratingCount
        : 0;

    return res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating,
      ratingCount,
      reviews,
    });
  } catch (error) {
    console.error(
      "Get platform reviews error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch platform reviews",
    });
  }
};

const getMyReviews = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const reviews =
      await ReviewModel.find({
        user: userId,
      })
        .populate(
          "professional",
          "firstName lastName specialization profilePhoto"
        )
        .populate(
          "payment",
          "amount appointmentDate appointmentDay appointmentSlot sessionDuration"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error(
      "Get my reviews error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch your reviews",
    });
  }
};

const getPaymentReview = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;
    const { paymentId } = req.params;

    if (
      !paymentId ||
      !mongoose.Types.ObjectId.isValid(paymentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const review =
      await ReviewModel.findOne({
        user: userId,
        payment: paymentId,
      });

    return res.status(200).json({
      success: true,
      reviewed: !!review,
      review: review || null,
    });
  } catch (error) {
    console.error(
      "Get payment review error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check review status",
    });
  }
};

const getAllReviews = async (
  req,
  res
) => {
  try {
    const { type } = req.query;

    const query = {};

    if (
      type &&
      ["PROFESSIONAL", "PLATFORM"].includes(
        String(type).toUpperCase()
      )
    ) {
      query.reviewType =
        String(type).toUpperCase();
    }

    const reviews =
      await ReviewModel.find(query)
        .populate(
          "user",
          "firstName lastName email profilePhoto"
        )
        .populate(
          "professional",
          "firstName lastName specialization email profilePhoto"
        )
        .populate(
          "payment",
          "amount appointmentDate appointmentDay appointmentSlot"
        )
        .sort({
          createdAt: -1,
        });

    const totalCount =
      await ReviewModel.countDocuments({});

    const platformCount =
      await ReviewModel.countDocuments({
        reviewType: "PLATFORM",
      });

    const professionalCount =
      await ReviewModel.countDocuments({
        reviewType: "PROFESSIONAL",
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
    console.error(
      "Get all reviews error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch reviews",
    });
  }
};

const deleteReview = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const userId = req.user.userId;
    const userRole = req.user.role;

    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const review =
      await ReviewModel.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner =
      review.user.toString() ===
      userId.toString();

    const isAdmin =
      userRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to delete this review",
      });
    }

    const professionalId =
      review.professional;

    const isProfessionalReview =
      review.reviewType ===
      "PROFESSIONAL";

    await ReviewModel.findByIdAndDelete(id);

    if (
      isProfessionalReview &&
      professionalId
    ) {
      await recalculateProfessionalRating(
        professionalId
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Review deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete review error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete review",
    });
  }
};

module.exports = {
  createReview,
  getPendingRatings,
  getProfessionalReviews,
  getProfessionalRating:
    getProfessionalReviews,
  getPlatformReviews,
  getMyReviews,
  getPaymentReview,
  getAllReviews,
  deleteReview,
};
