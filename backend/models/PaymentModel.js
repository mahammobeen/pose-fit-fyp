const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // 20% PoseFit platform commission
    adminCommission: {
      type: Number,
      required: true,
      min: 0,
    },

    // 80% Professional share
    professionalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "usd",
      lowercase: true,
    },

    // Appointment Schedule Details
    appointmentDay: {
      type: String,
      trim: true,
    },

    appointmentSlot: {
      type: String,
      trim: true,
    },

    appointmentDate: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
    },

    // Stripe IDs
    stripePaymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
    },

    stripeTransferId: {
      type: String,
      sparse: true,
    },

    // Payment Status
    status: {
      type: String,
      enum: [
        "pending",
        "completed",
        "failed",
        
      ],
      default: "pending",
    },

    // Professional Connect Transfer Status
    payoutStatus: {
      type: String,
      enum: [
        "pending",
        "transferred",
        "paid",
        "failed",
      ],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      default: "stripe",
    },

    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const PaymentModel = mongoose.model("Payment", paymentSchema);

module.exports = PaymentModel;