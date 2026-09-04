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

    adminCommission: {
      type: Number,
      required: true,
      min: 0,
    },

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

    sessionDuration: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },

    notes: {
      type: String,
      trim: true,
    },

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

    meetingLink: {
      type: String,
      trim: true,
    },

    meetingEventId: {
      type: String,
      trim: true,
    },

    meetingReminderSent: {
      type: Boolean,
      default: false,
    },

    adminDeleted: {
      type: Boolean,
      default: false,
    },

    professionalDeleted: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    payoutStatus: {
      type: String,
      enum: ["pending", "transferred", "paid", "failed"],
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
  },
);

const PaymentModel = mongoose.model("Payment", paymentSchema);

module.exports = PaymentModel;

