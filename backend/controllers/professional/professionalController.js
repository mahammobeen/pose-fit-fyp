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

    // Fetch payments associated with this professional (only completed payments are valid bookings)
    let payments = await PaymentModel.find({
      professional: professionalId,
      status: "completed",
      professionalDeleted: false,
    })
      .populate("user", "firstName lastName email profilePhoto")
      .sort({ appointmentDate: -1, createdAt: -1 });

    const totalSessions = payments.length;
    const completedPayments = payments;
    const completedSessions = payments.length;

    // Compute monthly earnings (current calendar month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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

    const pendingEarnings = 0;

    // Issue 1: Upcoming sessions should ONLY show bookings where session date >= today
    const upcomingBookings = completedPayments.filter((p) => {
      if (!p.appointmentDate) return false;
      const appDate = new Date(p.appointmentDate);
      return appDate >= startOfToday;
    });

    // Issue 4: Dashboard Recent Bookings:
    // - Only show bookings from the last 7 days
    // - Among those, only show completed bookings (past date: < today)
    // - Older than 7 days automatically excluded
    const recentBookings = completedPayments
      .filter((p) => {
        if (!p.appointmentDate) return false;
        const appDate = new Date(p.appointmentDate);
        return appDate < startOfToday && appDate >= sevenDaysAgo;
      })
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));

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
        recentBookings,
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
    const { tab, status } = req.query;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfToday.setHours(0, 0, 0, 0);

    const activeTab = (tab || status || "all").toLowerCase();

    const query = {
      professional: professionalId,
      professionalDeleted: false,
      status: "completed", // Only completed payments are valid bookings
    };

    let sortOrder = { appointmentDate: -1, createdAt: -1 };

    if (activeTab === "pending") {
      // Pending = upcoming (future/today date) and payment is completed
      query.appointmentDate = { $gte: startOfToday };
      sortOrder = { appointmentDate: 1, createdAt: -1 };
    } else if (activeTab === "completed") {
      // Completed = session date has already passed
      query.appointmentDate = { $lt: startOfToday };
      sortOrder = { appointmentDate: -1, createdAt: -1 };
    }

    const bookings = await PaymentModel.find(query)
      .populate("user", "firstName lastName email profilePhoto")
      .sort(sortOrder);

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

    const booking = await PaymentModel.findOne({
      _id: id,
      professional: professionalId,
      professionalDeleted: false,
    }).populate(
      "user",
      "firstName lastName email profilePhoto"
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
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

    // Convert "09:00 AM" into minutes
    const convertToMinutes = (time) => {
      const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

      if (!match) return null;

      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const modifier = match[3].toUpperCase();

      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        return null;
      }

      if (modifier === "AM" && hours === 12) {
        hours = 0;
      }

      if (modifier === "PM" && hours !== 12) {
        hours += 12;
      }

      return hours * 60 + minutes;
    };

    // Validate every day's slots
    for (const dayItem of availability) {
      if (!dayItem.day || !Array.isArray(dayItem.slots)) {
        return res.status(400).json({
          success: false,
          message: "Each availability day must contain day and slots",
        });
      }

      const parsedSlots = [];

      for (const slot of dayItem.slots) {
        if (typeof slot !== "string") {
          return res.status(400).json({
            success: false,
            message: `Invalid time slot for ${dayItem.day}`,
          });
        }

        const parts = slot.split(" - ");

        if (parts.length !== 2) {
          return res.status(400).json({
            success: false,
            message: `Invalid time slot format for ${dayItem.day}. Use format like "09:00 AM - 10:00 AM".`,
          });
        }

        const start = convertToMinutes(parts[0].trim());
        const end = convertToMinutes(parts[1].trim());

        if (start === null || end === null) {
          return res.status(400).json({
            success: false,
            message: `Invalid time format for ${dayItem.day}. Use format like "09:00 AM - 10:00 AM".`,
          });
        }

        if (start >= end) {
          return res.status(400).json({
            success: false,
            message: `Start time must be before end time for ${dayItem.day}.`,
          });
        }

        const durationMinutes = end - start;
        const durationHours = durationMinutes / 60;

        // Minimum session duration = 1 hour
        if (durationMinutes < 60) {
          return res.status(400).json({
            success: false,
            message: `Each session slot must be at least 1 hour long. Invalid slot on ${dayItem.day}: ${slot}`,
          });
        }

        // Maximum session duration = 3 hours
        if (durationMinutes > 180) {
          return res.status(400).json({
            success: false,
            message: `Each session slot cannot be longer than 3 hours. Invalid slot on ${dayItem.day}: ${slot}`,
          });
        }

        // Duration must be in complete hours
        if (!Number.isInteger(durationHours)) {
          return res.status(400).json({
            success: false,
            message: `Session slots must be exactly 1, 2, or 3 hours long. Invalid slot on ${dayItem.day}: ${slot}`,
          });
        }

        parsedSlots.push({
          start,
          end,
        });
      }

      // Check overlapping slots
      for (let i = 0; i < parsedSlots.length; i++) {
        for (let j = i + 1; j < parsedSlots.length; j++) {
          const slotA = parsedSlots[i];
          const slotB = parsedSlots[j];

          const overlaps =
            slotA.start < slotB.end &&
            slotA.end > slotB.start;

          if (overlaps) {
            return res.status(400).json({
              success: false,
              message: `Overlapping time slots found on ${dayItem.day}. Please choose separate time ranges.`,
            });
          }
        }
      }
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

    // Synchronize pending payments with Stripe
    await syncPendingPayments(payments);

    // Fetch updated payments after synchronization
    payments = await PaymentModel.find({
      professional: professionalId,
    })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    /*
     * ONLY COMPLETED PAYMENTS ARE ACTIVE EARNINGS.
     *
     * Pending, cancelled and failed payments
     * are not included in earnings.
     */
    const completedPayments = payments.filter(
      (p) => p.status === "completed"
    );

    /*
     * CURRENT MONTH
     */
    const now = new Date();

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const monthlyPayments = completedPayments.filter((p) => {
      const paidDate = p.paidAt || p.createdAt;

      return new Date(paidDate) >= startOfMonth;
    });

    /*
     * TOTAL EARNINGS
     *
     * Only completed payments contribute to earnings.
     */
    const totalEarnings = completedPayments.reduce(
      (sum, p) => sum + Number(p.professionalAmount || 0),
      0
    );

    /*
     * CURRENT MONTH EARNINGS
     */
    const currentMonthEarnings = monthlyPayments.reduce(
      (sum, p) => sum + Number(p.professionalAmount || 0),
      0
    );

    /*
     * PENDING CLEARANCE
     *
     * Only pending payments are included.
     */
    const pendingEarnings = payments
      .filter((p) => p.status === "pending")
      .reduce(
        (sum, p) => sum + Number(p.professionalAmount || 0),
        0
      );

    /*
     * RELEASED EARNINGS
     *
     * Only completed payments that have actually been
     * transferred to the professional's Stripe Connect
     * account are included.
     */
    const releasedEarnings = completedPayments
      .filter(
        (p) =>
          p.payoutStatus === "transferred" ||
          p.payoutStatus === "paid"
      )
      .reduce(
        (sum, p) => sum + Number(p.professionalAmount || 0),
        0
      );

    return res.status(200).json({
      success: true,

      earnings: {
        totalEarnings: Number(totalEarnings.toFixed(2)),

        currentMonthEarnings: Number(
          currentMonthEarnings.toFixed(2)
        ),

        pendingEarnings: Number(
          pendingEarnings.toFixed(2)
        ),

        releasedEarnings: Number(
          releasedEarnings.toFixed(2)
        ),

        totalTransactionsCount: payments.length,

        completedTransactionsCount:
          completedPayments.length,
      },

      stripeStatus: {
        connected: !!professional.stripeAccountId,

        stripeAccountId:
          professional.stripeAccountId || null,

        accountStatus:
          professional.stripeAccountStatus ||
          "unconnected",

        chargesEnabled:
          !!professional.chargesEnabled,

        payoutsEnabled:
          !!professional.payoutsEnabled,

        maskedBank:
          professional.maskedBank || "",
      },

      paymentHistory: payments,
    });
  } catch (error) {
    console.error(
      "Get professional earnings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error while loading earnings data",
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
