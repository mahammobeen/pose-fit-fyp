const dotenv = require("dotenv");
dotenv.config();
const Stripe = require("stripe");
const UserModel = require("../../models/userModel");
const PaymentModel = require("../../models/paymentModel");

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey) : null;
};

// Helper: auto-syncs any pending checkout sessions directly with Stripe
const syncPendingPayments = async (payments) => {
  const pending = payments.filter((p) => p.status === "pending" && p.stripeSessionId);
  if (!pending.length) return;

  const stripe = getStripe();
  if (!stripe) return;

  for (const p of pending) {
    try {
      const session = await stripe.checkout.sessions.retrieve(p.stripeSessionId);
      if (session.payment_status === "paid") {
        p.status = "completed";
        p.payoutStatus = "transferred";
        p.stripePaymentIntentId = session.payment_intent;
        p.paidAt = new Date();
        await p.save();
      } else if (session.status === "expired") {
        p.status = "cancelled";
        await p.save();
      }
    } catch {
      // ignore
    }
  }
};

// 1. Professional Dashboard Metric Aggregation
const getProfessionalDashboard = async (req, res) => {
  try {
    const professionalId = req.user.userId;

    const professional = await UserModel.findOne({
      _id: professionalId,
      role: "PROFESSIONAL",
    }).select("-password -verificationCode");

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional not found",
      });
    }

    // Fetch payments associated with this professional
    let payments = await PaymentModel.find({
      professional: professionalId,
    })
      .populate("user", "firstName lastName email profilePhoto")
      .sort({ createdAt: -1 });

    // Sync any pending payments with Stripe
    await syncPendingPayments(payments);
    payments = await PaymentModel.find({ professional: professionalId })
      .populate("user", "firstName lastName email profilePhoto")
      .sort({ createdAt: -1 });

    const totalSessions = payments.length;

    const completedPayments = payments.filter((p) => p.status === "completed");
    const completedSessions = completedPayments.length;

    // Compute monthly earnings (current calendar month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyPayments = completedPayments.filter((p) => {
      const paidDate = p.paidAt || p.createdAt;
      return new Date(paidDate) >= startOfMonth;
    });

    const monthlyEarnings = monthlyPayments.reduce(
      (sum, p) => sum + (p.professionalAmount || 0),
      0
    );

    const totalEarnings = completedPayments.reduce(
      (sum, p) => sum + (p.professionalAmount || 0),
      0
    );

    const pendingEarnings = payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.professionalAmount || 0), 0);

    // Filter upcoming sessions/bookings
    const upcomingBookings = completedPayments.slice(0, 5);

    return res.status(200).json({
      success: true,
      dashboard: {
        professional: {
          _id: professional._id,
          firstName: professional.firstName,
          lastName: professional.lastName,
          email: professional.email,
          role: professional.role,
          professionalType: professional.professionalType,
          specialization: professional.specialization,
          sessionFee: professional.sessionFee,
          profilePhoto: professional.profilePhoto,
          professionalStatus: professional.professionalStatus,
          rejectionReason: professional.rejectionReason,
        },
        metrics: {
          totalSessions,
          completedSessions,
          upcomingSessionsCount: upcomingBookings.length,
          monthlyEarnings: Number(monthlyEarnings.toFixed(2)),
          totalEarnings: Number(totalEarnings.toFixed(2)),
          pendingEarnings: Number(pendingEarnings.toFixed(2)),
          averageRating: professional.rating?.average || 5.0,
          ratingCount: professional.rating?.count || 0,
        },
        stripeStatus: {
          connected: !!professional.stripeAccountId,
          stripeAccountId: professional.stripeAccountId || null,
          accountStatus: professional.stripeAccountStatus || "unconnected",
          chargesEnabled: !!professional.chargesEnabled,
          payoutsEnabled: !!professional.payoutsEnabled,
          maskedBank: professional.maskedBank || "",
        },
        recentBookings: upcomingBookings,
      },
    });
  } catch (error) {
    console.error("Get professional dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while loading dashboard",
      error: error.message,
    });
  }
};

// 2. Get Professional Profile
const getProfessionalProfile = async (req, res) => {
  try {
    const professionalId = req.user.userId;

    const professional = await UserModel.findOne({
      _id: professionalId,
      role: "PROFESSIONAL",
    }).select("-password -verificationCode");

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      professional,
    });
  } catch (error) {
    console.error("Get professional profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile",
      error: error.message,
    });
  }
};

// 3. Update Professional Profile
const updateProfessionalProfile = async (req, res) => {
  try {
    const professionalId = req.user.userId;

    const professional = await UserModel.findOne({
      _id: professionalId,
      role: "PROFESSIONAL",
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional profile not found",
      });
    }

    const {
      firstName,
      lastName,
      profilePhoto,
      bio,
      specialization,
      sessionFee,
      credentialDocs,
      availability,
    } = req.body;

    if (availability !== undefined) {
      professional.availability = availability;
    }

    if (firstName) professional.firstName = firstName;
    if (lastName) professional.lastName = lastName;
    if (profilePhoto !== undefined) professional.profilePhoto = profilePhoto;
    if (bio !== undefined) professional.bio = bio;
    if (specialization !== undefined) professional.specialization = specialization;
    if (sessionFee !== undefined) professional.sessionFee = Number(sessionFee);
    if (credentialDocs !== undefined) professional.credentialDocs = credentialDocs;

    if (
      professional.professionalStatus === "rejected" ||
      professional.professionalStatus === "REJECTED"
    ) {
      professional.professionalStatus = "pending_verification";
      professional.rejectionReason = undefined;
      professional.appliedAt = new Date();
    }

    await professional.save();

    const updatedData = professional.toObject();
    delete updatedData.password;
    delete updatedData.verificationCode;

    return res.status(200).json({
      success: true,
      message: "Professional profile updated successfully",
      professional: updatedData,
    });
  } catch (error) {
    console.error("Update professional profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
      error: error.message,
    });
  }
};

// 4. Get Professional Bookings
const getProfessionalBookings = async (req, res) => {
  try {
    const professionalId = req.user.userId;
    const { status } = req.query;

    const query = { professional: professionalId };

    if (status && ["completed", "pending", "refunded", "cancelled", "failed"].includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    let payments = await PaymentModel.find(query)
      .populate("user", "firstName lastName email profilePhoto")
      .sort({ createdAt: -1 });

    await syncPendingPayments(payments);
    const bookings = await PaymentModel.find(query)
      .populate("user", "firstName lastName email profilePhoto")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get professional bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching bookings",
      error: error.message,
    });
  }
};

// 5. Get Booking by ID
const getProfessionalBookingById = async (req, res) => {
  try {
    const professionalId = req.user.userId;
    const { id } = req.params;

    const booking = await PaymentModel.findById(id).populate(
      "user",
      "firstName lastName email profilePhoto"
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.professional.toString() !== professionalId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not have permission to view this booking",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Get booking by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching booking details",
      error: error.message,
    });
  }
};

// 6. Get Availability Schedule
const getAvailability = async (req, res) => {
  try {
    const professionalId = req.user.userId;

    const professional = await UserModel.findOne({
      _id: professionalId,
      role: "PROFESSIONAL",
    }).select("availability");

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional not found",
      });
    }

    return res.status(200).json({
      success: true,
      availability: professional.availability || [],
    });
  } catch (error) {
    console.error("Get availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching availability",
      error: error.message,
    });
  }
};

// 7. Update Availability Schedule
const updateAvailability = async (req, res) => {
  try {
    const professionalId = req.user.userId;
    const { availability } = req.body;

    if (!Array.isArray(availability)) {
      return res.status(400).json({
        success: false,
        message: "Availability must be an array of day & slot objects",
      });
    }

    const professional = await UserModel.findOne({
      _id: professionalId,
      role: "PROFESSIONAL",
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional not found",
      });
    }

    professional.availability = availability;
    await professional.save();

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      availability: professional.availability,
    });
  } catch (error) {
    console.error("Update availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while updating availability",
      error: error.message,
    });
  }
};

// 8. Get Professional Earnings Breakdown
const getProfessionalEarnings = async (req, res) => {
  try {
    const professionalId = req.user.userId;

    const professional = await UserModel.findById(professionalId).select(
      "stripeAccountId stripeAccountStatus chargesEnabled payoutsEnabled maskedBank"
    );

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional not found",
      });
    }

    let payments = await PaymentModel.find({
      professional: professionalId,
    })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    await syncPendingPayments(payments);
    payments = await PaymentModel.find({
      professional: professionalId,
    })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    const completedPayments = payments.filter((p) => p.status === "completed");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyPayments = completedPayments.filter((p) => {
      const paidDate = p.paidAt || p.createdAt;
      return new Date(paidDate) >= startOfMonth;
    });

    const totalEarnings = completedPayments.reduce(
      (sum, p) => sum + (p.professionalAmount || 0),
      0
    );

    const currentMonthEarnings = monthlyPayments.reduce(
      (sum, p) => sum + (p.professionalAmount || 0),
      0
    );

    const pendingEarnings = payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.professionalAmount || 0), 0);

    const releasedEarnings = completedPayments
      .filter((p) => p.payoutStatus === "transferred" || p.payoutStatus === "paid")
      .reduce((sum, p) => sum + (p.professionalAmount || 0), 0);

    return res.status(200).json({
      success: true,
      earnings: {
        totalEarnings: Number(totalEarnings.toFixed(2)),
        currentMonthEarnings: Number(currentMonthEarnings.toFixed(2)),
        pendingEarnings: Number(pendingEarnings.toFixed(2)),
        releasedEarnings: Number(releasedEarnings.toFixed(2)),
        totalTransactionsCount: payments.length,
        completedTransactionsCount: completedPayments.length,
      },
      stripeStatus: {
        connected: !!professional.stripeAccountId,
        stripeAccountId: professional.stripeAccountId || null,
        accountStatus: professional.stripeAccountStatus || "unconnected",
        chargesEnabled: !!professional.chargesEnabled,
        payoutsEnabled: !!professional.payoutsEnabled,
        maskedBank: professional.maskedBank || "",
      },
      paymentHistory: payments,
    });
  } catch (error) {
    console.error("Get professional earnings error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while loading earnings data",
      error: error.message,
    });
  }
};

module.exports = {
  getProfessionalDashboard,
  getProfessionalProfile,
  updateProfessionalProfile,
  getProfessionalBookings,
  getProfessionalBookingById,
  getAvailability,
  updateAvailability,
  getProfessionalEarnings,
};
