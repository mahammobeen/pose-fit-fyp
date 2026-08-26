const dotenv = require("dotenv");
dotenv.config();

const Stripe = require("stripe");
const PaymentModel = require("../../models/paymentModel");
const UserModel = require("../../models/userModel");

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not configured");
  }
  return new Stripe(secretKey);
};

// 1. Create Payment Session with Direct Connect Transfer Split (20% Platform / 80% Professional)
const createPayment = async (req, res) => {
  try {
    const stripe = getStripe();
    const {
      professionalId,
      amount,
      appointmentDay,
      appointmentSlot,
      appointmentDate,
      notes,
    } = req.body;

    if (!professionalId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Professional and amount are required",
      });
    }

    const totalAmount = Number(amount);

    if (totalAmount <= 0) {
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

    // Fetch Professional & Verify Eligibility
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

    // Verify Professional Stripe Connect Account & Payout Status
    if (!professional.stripeAccountId) {
      return res.status(400).json({
        success: false,
        message: "Professional payout account is not connected or payouts are not enabled.",
      });
    }

    // Verify status live with Stripe (Accounts V2)
    let payoutsEnabled = professional.payoutsEnabled;
    try {
      let v2Account;
      try {
        v2Account = await stripe.v2.core.accounts.retrieve(professional.stripeAccountId, {
          include: ["configuration.recipient"],
        });
      } catch {
        v2Account = null;
      }

      if (v2Account) {
        const recipientCaps = v2Account.configuration?.recipient?.capabilities?.stripe_balance;
        const transfersActive = recipientCaps?.stripe_transfers?.status === "active";
        const payoutsActive = recipientCaps?.payouts?.status === "active";
        payoutsEnabled = transfersActive || payoutsActive || professional.payoutsEnabled;
      } else {
        const account = await stripe.accounts.retrieve(professional.stripeAccountId);
        payoutsEnabled = !!account.payouts_enabled || !!account.charges_enabled;
      }

      // Update cached values in DB
      professional.payoutsEnabled = payoutsEnabled;
      professional.chargesEnabled = payoutsEnabled;
      professional.stripeAccountStatus = payoutsEnabled ? "active" : "pending";
      await professional.save();
    } catch (acctErr) {
      console.error("Error retrieving Stripe Connect account:", acctErr);
    }

    if (!payoutsEnabled) {
      return res.status(400).json({
        success: false,
        message: "Professional payout account is not connected or payouts are not enabled.",
      });
    }

    // 20% PoseFit Admin Commission / 80% Professional Share
    const adminCommission = Number((totalAmount * 0.2).toFixed(2));
    const professionalAmount = Number((totalAmount * 0.8).toFixed(2));

    const payment = await PaymentModel.create({
      user: userId,
      professional: professionalId,
      amount: totalAmount,
      adminCommission,
      professionalAmount,
      appointmentDay: appointmentDay || "",
      appointmentSlot: appointmentSlot || "",
      appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
      notes: notes || "",
      currency: "usd",
      status: "pending",
      payoutStatus: "pending",
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const slotInfo = appointmentDay && appointmentSlot ? ` (${appointmentDay}, ${appointmentSlot})` : "";

    // Create Stripe Checkout Session with Direct Connect Transfer Split
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `PoseFit Session with ${professional.firstName} ${professional.lastName}${slotInfo}`,
              description: appointmentSlot ? `Appointment Slot: ${appointmentDay} ${appointmentSlot}` : "1-on-1 Fitness Session",
            },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        },
      ],

      // Payment Split: 20% stays on Admin Platform, 80% transferred to Professional's Connected Account
      payment_intent_data: {
        application_fee_amount: Math.round(adminCommission * 100),
        transfer_data: {
          destination: professional.stripeAccountId,
        },
        metadata: {
          paymentId: payment._id.toString(),
          professionalId: professionalId.toString(),
          userId: userId.toString(),
          appointmentDay: appointmentDay || "",
          appointmentSlot: appointmentSlot || "",
        },
      },

      metadata: {
        paymentId: payment._id.toString(),
        professionalId: professionalId.toString(),
        userId: userId.toString(),
        appointmentDay: appointmentDay || "",
        appointmentSlot: appointmentSlot || "",
      },

      success_url: `${frontendUrl}/user/professionals/${professionalId}?booking_success=true`,
      cancel_url: `${frontendUrl}/user/professionals/${professionalId}?booking_cancelled=true`,
    });

    payment.stripeSessionId = session.id;

    await payment.save();

    return res.status(201).json({
      success: true,
      message: "Payment session created successfully",
      paymentId: payment._id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Create payment error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while creating payment session",
    });
  }
};

// 2. Get single payment details
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

// 3. Get user payment history
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

// 4. Get all payments and metrics for Admin Panel
const getAdminPayments = async (req, res) => {
  try {
    const payments = await PaymentModel.find()
      .populate("user", "firstName lastName email")
      .populate("professional", "firstName lastName email stripeAccountId stripeAccountStatus payoutsEnabled maskedBank")
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
    const failedCount = payments.filter((p) => p.status === "failed").length;
    const refundedCount = payments.filter((p) => p.status === "refunded").length;
    const pendingCount = payments.filter((p) => p.status === "pending").length;

    return res.status(200).json({
      success: true,
      totalRevenue,
      totalCommission,
      totalProfessionalEarnings,
      completedCount,
      failedCount,
      refundedCount,
      pendingCount,
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

// 5. Refund a payment and reverse connected transfer
const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const stripe = getStripe();

    const payment = await PaymentModel.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed payments can be refunded",
      });
    }

    if (!payment.stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Stripe payment intent not found",
      });
    }

    // Process Stripe Connect Refund with Transfer Reversal
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    });

    payment.status = "refunded";
    payment.payoutStatus = "failed";
    payment.refundedAt = new Date();

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment refunded successfully and connected transfer reversed",
      refundId: refund.id,
    });
  } catch (error) {
    console.error("Refund payment error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to refund payment",
    });
  }
};

// 6. Generate Stripe Connect Onboarding Link (Accounts V2)
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

    // Verify existing V2 account if present
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

    // Create a new Stripe Connected Account using Accounts V2 API (POST /v2/core/accounts)
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

    // Generate Stripe Onboarding URL using Accounts V2 AccountLinks API (POST /v2/core/account_links)
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

// 7. Get Connect Status (Accounts V2)
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

    // Retrieve status from Stripe Accounts V2 (GET /v2/core/accounts/:id)
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

    // Synchronize DB status
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

// 8. Get Stripe Express Dashboard link or update link
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

// 9. Stripe Webhook Handler
const stripeWebhook = async (req, res) => {
  try {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    // 1. Checkout Session Completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await PaymentModel.findByIdAndUpdate(paymentId, {
          status: "completed",
          payoutStatus: "transferred",
          stripePaymentIntentId: session.payment_intent,
          paidAt: new Date(),
        });
      }
    }

    // 2. Checkout Session Expired / Failed
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await PaymentModel.findByIdAndUpdate(paymentId, {
          status: "cancelled",
        });
      }
    }

    // 3. Stripe Connect Account Updated (Onboarding / Payout Capability Changes)
    if (event.type === "account.updated" || event.type?.startsWith("v2.core.account")) {
      const account = event.data.object;

      const user = await UserModel.findOne({ stripeAccountId: account.id });
      if (user) {
        let chargesEnabled = !!account.charges_enabled;
        let payoutsEnabled = !!account.payouts_enabled;

        if (account.configuration?.recipient?.capabilities?.stripe_balance) {
          const recipientCaps = account.configuration.recipient.capabilities.stripe_balance;
          chargesEnabled = recipientCaps.stripe_transfers?.status === "active";
          payoutsEnabled = recipientCaps.payouts?.status === "active" || recipientCaps.stripe_transfers?.status === "active";
        }

        const status = payoutsEnabled ? "active" : "pending";

        let maskedBank = user.maskedBank || "";
        if (account.external_accounts && account.external_accounts.data && account.external_accounts.data.length > 0) {
          const ext = account.external_accounts.data[0];
          if (ext.last4) {
            maskedBank = `****${ext.last4}`;
          }
        }

        user.chargesEnabled = chargesEnabled;
        user.payoutsEnabled = payoutsEnabled;
        user.stripeAccountStatus = status;
        user.maskedBank = maskedBank;
        await user.save();
      }
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook handler failed",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getPayment,
  getUserPayments,
  getAdminPayments,
  refundPayment,
  createConnectOnboardingSession,
  getConnectStatus,
  getConnectDashboardLink,
  stripeWebhook,
};