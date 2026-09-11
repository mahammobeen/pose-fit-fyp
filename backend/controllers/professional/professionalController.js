const dotenv = require("dotenv");
dotenv.config();
const Stripe = require("stripe");
const UserModel = require("../../models/userModel");
const PaymentModel = require("../../models/paymentModel");

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey) : null;
};


// Helper: Checks if a session appointment date and slot end time has passed
const isSessionPassed = (booking, now = new Date()) => {
  if (!booking?.appointmentDate) return true;
  const appDate = new Date(booking.appointmentDate);
  if (Number.isNaN(appDate.getTime())) return true;

  const appDay = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (appDay < startOfToday) return true;
  if (appDay > startOfToday) return false;

  // Same day: check appointmentSlot end time
  if (!booking.appointmentSlot) return false;

  const slotStr = String(booking.appointmentSlot).trim();
  const parts = slotStr.split(/\s*-\s*/);
  const startPart = parts[0]?.trim() || "";
  const endPart = parts[1]?.trim() || "";

  const parseTime = (str, fallbackMeridiem = null) => {
    const match = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3]?.toUpperCase() || fallbackMeridiem;

    if (meridiem === "PM" && h < 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;

    return { h, m, meridiem };
  };

  const startTime = parseTime(startPart);
  if (!startTime) return false;

  let endHour = startTime.h;
  let endMinute = startTime.m;

  if (endPart) {
    const parsedEnd = parseTime(endPart, startTime.meridiem);
    if (parsedEnd) {
      endHour = parsedEnd.h;
      endMinute = parsedEnd.m;
    } else {
      const dur = Number(booking.sessionDuration) || 1;
      endHour += dur;
    }
  } else {
    const dur = Number(booking.sessionDuration) || 1;
    endHour += dur;
  }

  const sessionEndTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    endHour,
    endMinute,
    0,
    0
  );

  return sessionEndTime <= now;
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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Automatically update status to "completed" in the database for any payment record
    // where appointmentDate is in the past and status is still "pending"
    await PaymentModel.updateMany(
      {
        professional: professionalId,
        appointmentDate: { $lt: startOfToday },
        status: "pending",
      },
      {
        $set: { status: "completed" },
      }
    );

    // Fetch all bookings for this professional (including completed and pending)
    let payments = await PaymentModel.find({
      professional: professionalId,
      status: { $in: ["completed", "pending"] },
      professionalDeleted: false,
    })
      .populate("user", "firstName lastName email profilePhoto")
      .sort({ appointmentDate: -1, createdAt: -1 });

    // Auto-update any booking that has already passed its slot time to status = "completed"
    for (const p of payments) {
      if (isSessionPassed(p, now) && p.status === "pending") {
        p.status = "completed";
        await p.save();
      }
    }

    const totalSessions = payments.length;

    // Upcoming sessions: ONLY bookings whose session date & slot end time has NOT passed
    const upcomingBookings = payments.filter((p) => !isSessionPassed(p, now));
    const upcomingSessionsCount = upcomingBookings.length;

    // Completed sessions: bookings that have already passed
    const completedPayments = payments.filter((p) => isSessionPassed(p, now) || p.status === "completed");
    const completedSessions = completedPayments.length;

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

    // Recent Bookings: sessions completed in the last 7 days
    const recentBookings = payments
      .filter((p) => {
        if (!p.appointmentDate) return false;
        const appDate = new Date(p.appointmentDate);
        return isSessionPassed(p, now) && appDate >= sevenDaysAgo;
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
      experience,
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
    if (experience !== undefined) professional.experience = Number(experience);
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

    // Automatically update status to "completed" in the database for any payment record
    // where appointmentDate is in the past and status is still "pending"
    await PaymentModel.updateMany(
      {
        professional: professionalId,
        appointmentDate: { $lt: startOfToday },
        status: "pending",
      },
      {
        $set: { status: "completed" },
      }
    );

    const activeTab = (tab || status || "all").toLowerCase();

    const query = {
      professional: professionalId,
      professionalDeleted: false,
      status: { $in: ["completed", "pending"] },
    };

    let sortOrder = { appointmentDate: -1, createdAt: -1 };

    if (activeTab === "pending") {
      // Pending = upcoming (future/today date)
      query.appointmentDate = { $gte: startOfToday };
      sortOrder = { appointmentDate: 1, createdAt: -1 };
    } else if (activeTab === "completed") {
      // Completed = session date has already passed
      const endOfToday = new Date(startOfToday);
      endOfToday.setHours(23, 59, 59, 999);
      query.appointmentDate = { $lte: endOfToday };
      sortOrder = { appointmentDate: -1, createdAt: -1 };
    }

    const bookings = await PaymentModel.find(query)
      .populate("user", "firstName lastName email profilePhoto")
      .sort(sortOrder);

    for (const b of bookings) {
      if (isSessionPassed(b, now) && b.status === "pending") {
        b.status = "completed";
        await b.save();
      }
    }

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

    const payments = await PaymentModel.find({
      professional: professionalId,
      professionalDeleted: false,
    })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    /*
     * ONLY COMPLETED PAYMENTS ARE ACTIVE EARNINGS.
     * Failed payments are not included in earnings.
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
