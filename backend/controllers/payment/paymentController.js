const dotenv = require("dotenv");
dotenv.config();

const Stripe = require("stripe");
const PaymentModel = require("../../models/PaymentModel");
const UserModel = require("../../models/userModel");
const {
createGoogleMeetEvent,
} = require("../../services/googleCalendarService");

const {
  sendBookingConfirmationEmails,

} = require("../../services/emailService");

const {
  processBookingReminders,
} = require("../../services/bookingReminderService");

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not configured");
  }
  return new Stripe(secretKey);
};

const getSlotStartDateTime = (appointmentDate, appointmentSlot) => {
  if (!appointmentDate || !appointmentSlot) return null;

  const dateStr =
    typeof appointmentDate === "string"
      ? appointmentDate.slice(0, 10)
      : appointmentDate.toISOString().slice(0, 10);

  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parts = String(appointmentSlot).split("-").map((p) => p.trim());
  const startPart = parts[0];
  const endPart = parts[1] || "";

  const match = startPart.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  let meridiem = match[3] ? match[3].toUpperCase() : null;

  if (!meridiem && endPart) {
    const endMatch = endPart.match(/(AM|PM)/i);
    if (endMatch) {
      meridiem = endMatch[1].toUpperCase();
    }
  }

  if (meridiem === "PM" && hour < 12) {
    hour += 12;
  } else if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  const slotDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(slotDate.getTime()) ? null : slotDate;
};

const createPayment = async (req, res) => {
  let reservedPayment = null;

  try {
    const stripe = getStripe();

    const {
      professionalId,
      amount,
      appointmentDay,
      appointmentSlot,
      appointmentDate,
      sessionDuration,
      notes,
    } = req.body;

    if (!professionalId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Professional and amount are required",
      });
    }

    const totalAmount = Number(amount);

    if (Number.isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (!appointmentDay || !appointmentSlot || !appointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Appointment day, slot and date are required",
      });
    }

    const dateStr = String(appointmentDate).slice(0, 10);
    const dateParts = dateStr.split("-").map(Number);

    if (
      dateParts.length !== 3 ||
      dateParts.some(Number.isNaN)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date format. Expected YYYY-MM-DD",
      });
    }

    const [year, month, day] = dateParts;

    const parsedAppointmentDate = new Date(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0,
    );

    if (Number.isNaN(parsedAppointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date",
      });
    }

    if (
      parsedAppointmentDate.getFullYear() !== year ||
      parsedAppointmentDate.getMonth() !== month - 1 ||
      parsedAppointmentDate.getDate() !== day
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date",
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const targetDateStart = new Date(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0,
    );

    if (targetDateStart < todayStart) {
      return res.status(400).json({
        success: false,
        message: "Cannot book an appointment for a past date.",
      });
    }

    const DAY_NAMES = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const actualDay =
      DAY_NAMES[parsedAppointmentDate.getDay()];

    if (
      actualDay.toLowerCase() !==
      appointmentDay.trim().toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message: `Appointment day (${appointmentDay}) does not match appointment date (${actualDay}).`,
      });
    }

    if (
      targetDateStart.getTime() ===
      todayStart.getTime()
    ) {
      const slotStart = getSlotStartDateTime(
        dateStr,
        appointmentSlot,
      );

      if (
        !slotStart ||
        slotStart.getTime() <= Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The selected appointment slot has already passed for today. Please select an upcoming slot or a future date.",
        });
      }
    }

      const parsedSessionDuration =
      Number(sessionDuration) || 1;

    if (parsedSessionDuration !== 1) {
      return res.status(400).json({
        success: false,
        message:
          "Session duration must be 1 hour",
      });
    }

    const professional = await UserModel.findOne({
      _id: professionalId,
      role: "PROFESSIONAL",
      professionalStatus: {
        $in: ["approved", "APPROVED"],
      },
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Approved professional not found",
      });
    }

    const selectedDay =
      professional.availability?.find(
        (item) =>
          item.day?.trim().toLowerCase() ===
          appointmentDay.trim().toLowerCase(),
      );

    if (!selectedDay) {
      return res.status(400).json({
        success: false,
        message:
          "The selected day is not available for this professional.",
      });
    }

    const normalizedSlot =
      appointmentSlot.trim();

    const slotExists =
      selectedDay.slots?.some(
        (slot) =>
          slot.trim() === normalizedSlot,
      );

    if (!slotExists) {
      return res.status(400).json({
        success: false,
        message:
          "The selected appointment slot is not available.",
      });
    }

    if (!professional.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message:
          "Professional payout account is not connected or payouts are not enabled.",
      });
    }

    let payoutsEnabled =
      professional.payoutsEnabled;

    try {
      let v2Account;

      try {
        v2Account =
          await stripe.v2.core.accounts.retrieve(
            professional.stripeAccountId,
            {
              include: [
                "configuration.recipient",
              ],
            },
          );
      } catch {
        v2Account = null;
      }

      if (v2Account) {
        const recipientCaps =
          v2Account.configuration?.recipient
            ?.capabilities?.stripe_balance;

        const transfersActive =
          recipientCaps?.stripe_transfers
            ?.status === "active";

        const payoutsActive =
          recipientCaps?.payouts?.status ===
          "active";

        payoutsEnabled =
          transfersActive ||
          payoutsActive ||
          professional.payoutsEnabled;
      } else {
        const account =
          await stripe.accounts.retrieve(
            professional.stripeAccountId,
          );

        payoutsEnabled =
          !!account.payouts_enabled ||
          !!account.charges_enabled;
      }

      professional.payoutsEnabled =
        payoutsEnabled;

      professional.chargesEnabled =
        payoutsEnabled;

      professional.stripeAccountStatus =
        payoutsEnabled
          ? "active"
          : "pending";

      await professional.save();
    } catch (acctErr) {
      console.error(
        "Error retrieving Stripe Connect account:",
        acctErr,
      );
    }

    if (!payoutsEnabled) {
      return res.status(400).json({
        success: false,
        message:
          "Professional payout account is not connected or payouts are not enabled.",
      });
    }

    const adminCommission = Number(
      (totalAmount * 0.2).toFixed(2),
    );

    const professionalAmount = Number(
      (totalAmount * 0.8).toFixed(2),
    );

    const existingPendingPayment =
      await PaymentModel.findOne({
        user: userId,
        professional: professionalId,
        appointmentDate: parsedAppointmentDate,
        appointmentSlot: normalizedSlot,
        status: "pending",
        professionalDeleted: false,
      }).sort({
        createdAt: -1,
      });

    if (existingPendingPayment) {
      existingPendingPayment.status = "failed";
      existingPendingPayment.payoutStatus = "failed";

      await existingPendingPayment.save();
    }

    try {
      reservedPayment =
        await PaymentModel.create({
          user: userId,
          professional: professionalId,
          amount: totalAmount,
          adminCommission,
          professionalAmount,
          currency: "pkr",
          appointmentDay:
            appointmentDay.trim(),
          appointmentSlot: normalizedSlot,
          appointmentDate:
            parsedAppointmentDate,
          sessionDuration:
            parsedSessionDuration,
          notes: notes?.trim() || "",
          status: "pending",
          payoutStatus: "pending",
          adminDeleted: false,
          professionalDeleted: false,
        });
    } catch (reservationError) {
      if (reservationError.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "This appointment slot is no longer available. Please select another slot.",
        });
      }

      throw reservationError;
    }

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const slotInfo =
      appointmentDay && appointmentSlot
        ? ` (${appointmentDay}, ${appointmentSlot})`
        : "";

    const bookingMetadata = {
      paymentId:
        reservedPayment._id.toString(),

      professionalId:
        professionalId.toString(),

      userId:
        userId.toString(),

      amount:
        totalAmount.toString(),

      adminCommission:
        adminCommission.toString(),

      professionalAmount:
        professionalAmount.toString(),

      appointmentDay:
        appointmentDay.trim(),

      appointmentSlot:
        normalizedSlot,

      appointmentDate:
        parsedAppointmentDate.toISOString(),

      sessionDuration:
        parsedSessionDuration.toString(),

      notes:
        notes?.trim() || "",
    };

    let session;

    try {
      session =
        await stripe.checkout.sessions.create({
          mode: "payment",

          expires_at:
            Math.floor(Date.now() / 1000) +
            30 * 60,

          line_items: [
            {
              price_data: {
                currency: "pkr",

                product_data: {
                  name:
                    `PoseFit Session with ` +
                    `${professional.firstName} ` +
                    `${professional.lastName}` +
                    `${slotInfo}`,

                  description:
                    `Appointment: ${appointmentDay} ${normalizedSlot}`,
                },

                unit_amount:
                  Math.round(
                    totalAmount * 100,
                  ),
              },

              quantity: 1,
            },
          ],

          payment_intent_data: {
            application_fee_amount:
              Math.round(
                adminCommission * 100,
              ),

            transfer_data: {
              destination:
                professional.stripeAccountId,
            },

            metadata: bookingMetadata,
          },

          metadata: bookingMetadata,

          success_url:
            `${frontendUrl}/user/professionals/${professionalId}` +
            `?booking_success=true&session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${frontendUrl}/user/professionals/${professionalId}` +
            `?booking_cancelled=true&payment_id=${reservedPayment._id.toString()}`,
        });
    } catch (stripeError) {
      console.error(
        "Stripe checkout session creation error:",
        stripeError,
      );

      if (reservedPayment?._id) {
        await PaymentModel.findByIdAndUpdate(
          reservedPayment._id,
          {
            status: "failed",
            payoutStatus: "failed",
          },
        );
      }

      return res.status(500).json({
        success: false,
        message:
          stripeError.message ||
          "Failed to create Stripe checkout session",
      });
    }

    await PaymentModel.findByIdAndUpdate(
      reservedPayment._id,
      {
        stripeSessionId: session.id,
      },
    );

    return res.status(200).json({
      success: true,

      message:
        "Payment session created successfully.",

      checkoutUrl:
        session.url,

      paymentId:
        reservedPayment._id.toString(),

      sessionId:
        session.id,

      appointment: {
        day:
          appointmentDay.trim(),

        slot:
          normalizedSlot,

        date:
          parsedAppointmentDate,

        sessionDuration:
          parsedSessionDuration,
      },
    });
  } catch (error) {
    console.error(
      "Create payment error:",
      error,
    );

    if (reservedPayment?._id) {
      try {
        await PaymentModel.findByIdAndUpdate(
          reservedPayment._id,
          {
            status: "failed",
            payoutStatus: "failed",
          },
        );
      } catch (cleanupError) {
        console.error(
          "Payment reservation cleanup error:",
          cleanupError,
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Something went wrong while creating payment session",
    });
  }
};

const getPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await PaymentModel.findById(id)
      .populate("user", "firstName lastName email")
      .populate("professional", "firstName lastName email specialization sessionFee profilePhoto");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const payments = await PaymentModel.find({ user: userId })
      .populate("professional", "firstName lastName email specialization profilePhoto")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Get user payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getAdminPayments = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {
      adminDeleted: false,
      status: { $in: ["completed", "failed"] },
    };

    if (status && ["completed", "failed"].includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    const payments = await PaymentModel.find(query)
      .populate("user", "firstName lastName email")
      .populate(
        "professional",
        "firstName lastName email stripeAccountId stripeAccountStatus payoutsEnabled maskedBank"
      )
      .sort({ createdAt: -1 });

    const completedPayments = payments.filter(
      (payment) => payment.status === "completed"
    );

    const totalRevenue = completedPayments.reduce(
      (total, payment) => total + (payment.amount || 0),
      0
    );

    const totalCommission = completedPayments.reduce(
      (total, payment) => total + (payment.adminCommission || 0),
      0
    );

    const totalProfessionalEarnings = completedPayments.reduce(
      (total, payment) => total + (payment.professionalAmount || 0),
      0
    );

    const completedCount = completedPayments.length;
    const failedCount = payments.filter(
      (p) => p.status === "failed"
    ).length;

    return res.status(200).json({
      success: true,
      totalRevenue,
      totalCommission,
      totalProfessionalEarnings,
      completedCount,
      failedCount,
      totalTransactions: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Get admin payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payment records",
      error: error.message,
    });
  }
};

const deleteAdminPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await PaymentModel.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    payment.adminDeleted = true;

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment record removed from admin panel successfully",
    });
  } catch (error) {
    console.error("Delete admin payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete payment record from admin panel",
      error: error.message,
    });
  }
};

const deleteProfessionalPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const professionalId = req.user.userId;

    const payment = await PaymentModel.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (
      payment.professional.toString() !==
      professionalId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this payment record",
      });
    }

    payment.professionalDeleted = true;

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment record removed from professional panel successfully",
    });
  } catch (error) {
    console.error(
      "Delete professional payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete payment record from professional panel",
      error: error.message,
    });
  }
};

const getProfessionalBookedSlots = async (req, res) => {
  try {
    const { id } = req.params;

    const bookings = await PaymentModel.find({
      professional: id,
      status: "completed",
      professionalDeleted: false,
      appointmentDate: {
        $exists: true,
        $ne: null,
      },
      appointmentSlot: {
        $exists: true,
        $ne: "",
      },
    }).select(
      "appointmentDay appointmentSlot appointmentDate sessionDuration status",
    );

    const now = new Date();

    const activeBookings = bookings.filter((booking) => {
      if (!booking.appointmentDate || !booking.appointmentSlot) {
        return false;
      }

      const appointmentDate = new Date(booking.appointmentDate);

      if (Number.isNaN(appointmentDate.getTime())) {
        return false;
      }

      const slotText = booking.appointmentSlot.trim();

      const startTimeMatch = slotText.match(
        /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i,
      );

      if (!startTimeMatch) {
        return appointmentDate >= now;
      }

      let startHours = Number(startTimeMatch[1]);
      const startMinutes = Number(startTimeMatch[2] || 0);
      const meridiem = startTimeMatch[3]?.toUpperCase();

      if (meridiem === "PM" && startHours !== 12) {
        startHours += 12;
      }

      if (meridiem === "AM" && startHours === 12) {
        startHours = 0;
      }

      const startTime = new Date(appointmentDate);
      startTime.setHours(startHours, startMinutes, 0, 0);

      const duration = Number(booking.sessionDuration) || 1;

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + duration);

      return endTime > now;
    });

    return res.status(200).json({
      success: true,
      bookedSlots: activeBookings.map((booking) => ({
        appointmentDay: booking.appointmentDay,
        appointmentSlot: booking.appointmentSlot,
        appointmentDate: booking.appointmentDate,
      })),
    });
  } catch (error) {
    console.error(
      "Get professional booked slots error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch booked appointment slots",
    });
  }
};

const createConnectOnboardingSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const stripe = getStripe();

    const user = await UserModel.findById(userId);

    if (!user || user.role !== "PROFESSIONAL") {
      return res.status(403).json({
        success: false,
        message: "Only approved professionals can connect a Stripe payout account",
      });
    }

    let accountId = user.stripeAccountId;

    if (accountId) {
      try {
        const existingAcc = await stripe.v2.core.accounts.retrieve(accountId);
        if (!existingAcc || existingAcc.closed) {
          accountId = null;
        }
      } catch {
        accountId = null;
      }
    }

    if (!accountId) {
      const v2Account = await stripe.v2.core.accounts.create({
        contact_email: user.email,
        display_name: `${user.firstName || "Professional"} ${user.lastName || ""}`.trim(),
        dashboard: "express",
        defaults: {
          responsibilities: {
            losses_collector: "application",
            fees_collector: "application",
          },
        },
        identity: {
          country: "US",
          entity_type: "individual",
          individual: {
            email: user.email,
            given_name: user.firstName || "Professional",
            surname: user.lastName || "User",
          },
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        metadata: {
          userId: user._id.toString(),
          role: "PROFESSIONAL",
        },
      });

      accountId = v2Account.id;
      user.stripeAccountId = accountId;
      user.stripeAccountStatus = "pending";
      await user.save();
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${frontendUrl}/professional/dashboard?stripe=refresh`,
          return_url: `${frontendUrl}/professional/dashboard?stripe=return`,
        },
      },
    });

    return res.status(200).json({
      success: true,
      url: accountLink.url,
      stripeAccountId: accountId,
    });
  } catch (error) {
    console.error("Stripe Connect Accounts V2 onboarding error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to initiate Stripe Connect onboarding",
      error: error.message,
    });
  }
};

const getConnectStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.userId;
    const stripe = getStripe();

    const user = await UserModel.findById(targetUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.stripeAccountId) {
      return res.status(200).json({
        success: true,
        connected: false,
        stripeAccountStatus: "unconnected",
        chargesEnabled: false,
        payoutsEnabled: false,
        maskedBank: "",
      });
    }

    let account;
    try {
      account = await stripe.v2.core.accounts.retrieve(user.stripeAccountId, {
        include: ["configuration.recipient", "requirements"],
      });
    } catch {
      user.stripeAccountId = undefined;
      user.stripeAccountStatus = "unconnected";
      user.chargesEnabled = false;
      user.payoutsEnabled = false;
      user.maskedBank = "";
      await user.save();

      return res.status(200).json({
        success: true,
        connected: false,
        stripeAccountStatus: "unconnected",
        chargesEnabled: false,
        payoutsEnabled: false,
        maskedBank: "",
      });
    }

    const recipientCaps = account.configuration?.recipient?.capabilities?.stripe_balance;
    const transfersStatus = recipientCaps?.stripe_transfers?.status;
    const payoutsStatus = recipientCaps?.payouts?.status;

    const transfersActive = transfersStatus === "active";
    const payoutsActive = payoutsStatus === "active";

    const chargesEnabled = transfersActive;
    const payoutsEnabled = transfersActive || payoutsActive;
    const status = payoutsEnabled ? "active" : "pending";

    user.chargesEnabled = chargesEnabled;
    user.payoutsEnabled = payoutsEnabled;
    user.stripeAccountStatus = status;
    await user.save();

    return res.status(200).json({
      success: true,
      connected: true,
      stripeAccountId: user.stripeAccountId,
      stripeAccountStatus: user.stripeAccountStatus,
      chargesEnabled: user.chargesEnabled,
      payoutsEnabled: user.payoutsEnabled,
      maskedBank: user.maskedBank || "",
    });
  } catch (error) {
    console.error("Get Connect status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch Stripe Connect account status",
      error: error.message,
    });
  }
};

const getConnectDashboardLink = async (req, res) => {
  try {
    const userId = req.user.userId;
    const stripe = getStripe();

    const user = await UserModel.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: "No connected Stripe account found for this professional",
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    try {
      const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);
      return res.status(200).json({
        success: true,
        url: loginLink.url,
      });
    } catch {
      const accountLink = await stripe.v2.core.accountLinks.create({
        account: user.stripeAccountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["recipient"],
            refresh_url: `${frontendUrl}/professional/dashboard?stripe=refresh`,
            return_url: `${frontendUrl}/professional/dashboard?stripe=return`,
          },
        },
      });

      return res.status(200).json({
        success: true,
        url: accountLink.url,
      });
    }
  } catch (error) {
    console.error("Create dashboard link error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create Stripe Dashboard link",
      error: error.message,
    });
  }
};

const stripeWebhook = async (req, res) => {
  try {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Stripe webhook secret is not configured",
      });
    }

    if (!sig) {
      console.error("Stripe webhook signature is missing.");

      return res.status(400).json({
        success: false,
        message: "Stripe webhook signature is missing",
      });
    }

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error(
        "Webhook signature verification failed:",
        err.message
      );

      return res.status(400).send(
        `Webhook Error: ${err.message}`
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      let payment = null;
      let isNewOrUpdated = false;

      if (session.id) {
        payment = await PaymentModel.findOne({
          stripeSessionId: session.id,
        })
          .populate(
            "user",
            "firstName lastName email profilePhoto"
          )
          .populate(
            "professional",
            "firstName lastName email profilePhoto"
          );
      }

      if (!payment && session.metadata?.paymentId) {
        payment = await PaymentModel.findById(
          session.metadata.paymentId
        )
          .populate(
            "user",
            "firstName lastName email profilePhoto"
          )
          .populate(
            "professional",
            "firstName lastName email profilePhoto"
          );
      }

      if (
        !payment &&
        session.metadata?.userId &&
        session.metadata?.professionalId
      ) {
        const totalAmount =
          Number(session.metadata.amount) ||
          (session.amount_total
            ? session.amount_total / 100
            : 0);

        const adminCommission =
          Number(session.metadata.adminCommission) ||
          Number((totalAmount * 0.2).toFixed(2));

        const professionalAmount =
          Number(session.metadata.professionalAmount) ||
          Number((totalAmount * 0.8).toFixed(2));

        payment = await PaymentModel.create({
          user: session.metadata.userId,
          professional: session.metadata.professionalId,
          amount: totalAmount,
          adminCommission,
          professionalAmount,
          appointmentDay:
            session.metadata.appointmentDay || "",
          appointmentSlot:
            session.metadata.appointmentSlot || "",
          appointmentDate:
            session.metadata.appointmentDate
              ? new Date(session.metadata.appointmentDate)
              : new Date(),
          sessionDuration:
            Number(session.metadata.sessionDuration) || 1,
          notes: session.metadata.notes || "",
          currency: session.currency || "pkr",
          stripeSessionId: session.id,
          stripePaymentIntentId:
            session.payment_intent || "",
          status: "completed",
          payoutStatus: "transferred",
          paidAt: new Date(),
          adminDeleted: false,
          professionalDeleted: false,
        });

        isNewOrUpdated = true;

        await payment.populate(
          "user",
          "firstName lastName email profilePhoto"
        );

        await payment.populate(
          "professional",
          "firstName lastName email profilePhoto"
        );
      }

      if (payment) {
        if (payment.status !== "completed") {
          payment.status = "completed";
          payment.payoutStatus = "transferred";

          if (session.payment_intent) {
            payment.stripePaymentIntentId =
              session.payment_intent;
          }

          payment.paidAt = new Date();

          await payment.save();
          isNewOrUpdated = true;

          console.log(
            `Payment ${payment._id} marked as completed successfully.`
          );
        }

        if (!payment.meetingLink) {
          try {
            const meeting = await createGoogleMeetEvent({
              appointmentDate: payment.appointmentDate,
              appointmentSlot: payment.appointmentSlot,
              user: payment.user,
              professional: payment.professional,
              notes: payment.notes,
            });

            payment.meetingLink = meeting.meetingLink;
            payment.meetingEventId = meeting.eventId;

            await payment.save();

            console.log(
              `Google Meet created for payment ${payment._id}: ${meeting.meetingLink}`
            );
          } catch (meetingError) {
            console.error(
              `Google Meet creation error for payment ${payment._id}:`,
              meetingError
            );
          }
        }

        if (
  payment.status === "completed" &&
  !payment.confirmationEmailSent
) {
  try {
    await sendBookingConfirmationEmails({
      user: payment.user,
      professional: payment.professional,
      appointmentDate: payment.appointmentDate,
      appointmentDay: payment.appointmentDay,
      appointmentSlot: payment.appointmentSlot,
    });

    payment.confirmationEmailSent = true;
    await payment.save();

    console.log(
      `Booking confirmation emails sent for payment ${payment._id}.`
    );
  } catch (emailError) {
    console.error(
      `Booking confirmation email error for payment ${payment._id}:`,
      emailError
    );
  }
}
      } else {
        console.error(
          "Unable to resolve or create payment for checkout.session.completed."
        );
      }
    }
    
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;

      let payment = null;

      if (session.id) {
        payment = await PaymentModel.findOne({
          stripeSessionId: session.id,
        });
      }

      if (!payment && session.metadata?.paymentId) {
        payment = await PaymentModel.findById(
          session.metadata.paymentId
        );
      }

      if (payment && payment.status === "pending") {
        payment.status = "failed";
        payment.payoutStatus = "failed";

        await payment.save();

        console.log(
          `Expired Checkout session ${session.id}: payment ${payment._id} marked as failed and slot released.`
        );
      }
    }
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;

      const paymentId =
        paymentIntent.metadata?.paymentId;

      if (paymentId) {
        const payment =
          await PaymentModel.findById(paymentId);

        if (payment) {
          if (payment.status !== "completed") {
            payment.status = "completed";
            payment.payoutStatus = "transferred";
            payment.paidAt = new Date();
          }

          if (paymentIntent.id) {
            payment.stripePaymentIntentId =
              paymentIntent.id;
          }

          await payment.save();

          console.log(
            `Payment ${paymentId} completed through payment_intent.succeeded.`
          );
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;

      const paymentId =
        paymentIntent.metadata?.paymentId;

      if (paymentId) {
        const payment =
          await PaymentModel.findById(paymentId);

        if (payment) {
          payment.status = "failed";

          if (paymentIntent.id) {
            payment.stripePaymentIntentId =
              paymentIntent.id;
          }

          await payment.save();

          console.log(
            `Payment ${paymentId} marked as failed.`
          );
        }
      }
    }

    if (
      event.type === "account.updated" ||
      event.type?.startsWith("v2.core.account")
    ) {
      const account = event.data.object;

      const user = await UserModel.findOne({
        stripeAccountId: account.id,
      });

      if (user) {
        let chargesEnabled =
          !!account.charges_enabled;

        let payoutsEnabled =
          !!account.payouts_enabled;

        if (
          account.configuration?.recipient?.capabilities
            ?.stripe_balance
        ) {
          const recipientCaps =
            account.configuration.recipient.capabilities
              .stripe_balance;

          chargesEnabled =
            recipientCaps.stripe_transfers?.status ===
            "active";

          payoutsEnabled =
            recipientCaps.payouts?.status ===
              "active" ||
            recipientCaps.stripe_transfers?.status ===
              "active";
        }

        const stripeAccountStatus =
          payoutsEnabled ? "active" : "pending";

        let maskedBank =
          user.maskedBank || "";

        if (
          account.external_accounts &&
          account.external_accounts.data &&
          account.external_accounts.data.length > 0
        ) {
          const ext =
            account.external_accounts.data[0];

          if (ext.last4) {
            maskedBank = `****${ext.last4}`;
          }
        }

        user.chargesEnabled = chargesEnabled;
        user.payoutsEnabled = payoutsEnabled;
        user.stripeAccountStatus =
          stripeAccountStatus;
        user.maskedBank = maskedBank;

        await user.save();

        console.log(
          `Stripe Connect account ${account.id} updated successfully.`
        );
      }
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Webhook handler failed",
      error: error.message,
    });
  }
};


const cancelPayment = async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "paymentId is required",
      });
    }

    const userId = (
      req.user?.userId ||
      req.user?._id ||
      req.user?.id ||
      ""
    ).toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const payment = await PaymentModel.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this payment",
      });
    }

    if (payment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed payment cannot be cancelled.",
      });
    }

    if (payment.status === "pending") {
      payment.status = "failed";
      payment.payoutStatus = "failed";

      await payment.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment attempt cancelled and appointment slot released.",
      status: payment.status,
    });
  } catch (error) {
    console.error("Cancel payment error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel payment",
    });
  }
};
const verifySession = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "session_id is required",
      });
    }

    const currentUserId = (
      req.user?.userId ||
      req.user?._id ||
      req.user?.id ||
      ""
    ).toString();

    const payment = await PaymentModel.findOne({ stripeSessionId: session_id })
      .populate("user", "firstName lastName email profilePhoto")
      .populate("professional", "firstName lastName email profilePhoto");

    if (payment) {
      const paymentUserId = (
        payment.user?._id ||
        payment.user ||
        ""
      ).toString();

      if (paymentUserId && currentUserId && paymentUserId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this booking session",
        });
      }

      if (payment.status === "completed") {
        return res.status(200).json({
          success: true,
          bookingConfirmed: true,
          status: "completed",
          payment,
        });
      }

      return res.status(200).json({
        success: true,
        bookingConfirmed: false,
        status: payment.status || "pending",
      });
    }

    return res.status(200).json({
      success: true,
      bookingConfirmed: false,
      status: "pending",
    });
  } catch (error) {
    console.error("Verify session error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify session",
    });
  }
};

const sendBookingReminders = async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Cron secret is not configured.",
      });
    }

    const providedSecret = req.headers["x-cron-secret"];

    if (!providedSecret || providedSecret !== cronSecret) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    await processBookingReminders();

    return res.status(200).json({
      success: true,
      message: "Booking reminders processed successfully.",
    });
  } catch (error) {
    console.error("Booking reminder controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process booking reminders.",
      error: error.message,
    });
  }
};
module.exports = {
  createPayment,
  getPayment,
  getUserPayments,
  getAdminPayments,
  deleteAdminPayment,
  deleteProfessionalPayment,
  getProfessionalBookedSlots,
  createConnectOnboardingSession,
  getConnectStatus,
  getConnectDashboardLink,
  stripeWebhook,
  cancelPayment,
  verifySession,
  sendBookingReminders,
};
