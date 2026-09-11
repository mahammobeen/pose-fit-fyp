const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },

  lastName: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["ADMIN", "USER", "PROFESSIONAL"],
    default: "USER",
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  verificationCode: {
    type: String,
  },

  professionalType: {
    type: String,
    enum: ["Trainer", "Nutritionist", "TRAINER", "NUTRITIONIST", "OTHER"],
    required: function () {
      return this.role === "PROFESSIONAL";
    },
  },

  specialization: {
    type: String,
    trim: true,
  },

  experience: {
    type: Number,
    min: 0,
  },

  sessionFee: {
    type: Number,
    min: 0,
  },

  profilePhoto: {
    type: String,
    trim: true,
  },

  bio: {
    type: String,
    trim: true,
  },

  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      min: 0,
    },
  },

  credentialDocs: {
    type: [
      {
        title: {
          type: String,
          trim: true,
        },
        fileUrl: {
          type: String,
          trim: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: undefined,
  },

  availability: {
    type: [
      {
        day: {
          type: String,
          trim: true,
        },
        slots: [
          {
            type: String,
            trim: true,
          },
        ],
      },
    ],
    default: undefined,
  },

  professionalStatus: {
    type: String,
    enum: [
      "invited",
      "pending_verification",
      "approved",
      "rejected",
      "INVITED",
      "PENDING",
      "PENDING_VERIFICATION",
      "APPROVED",
      "REJECTED",
    ],
    default: function () {
      return this.role === "PROFESSIONAL" ? "invited" : undefined;
    },
  },

  rejectionReason: {
    type: String,
    trim: true,
  },

  verificationMeetingLink: {
    type: String,
    trim: true,
  },

  verificationMeetingTime: {
    type: Date,
  },

  verificationNotes: {
    type: String,
    trim: true,
  },

  appliedAt: {
    type: Date,
    default: function () {
      return this.role === "PROFESSIONAL" ? Date.now() : undefined;
    },
  },

  stripeAccountId: {
    type: String,
    trim: true,
  },

  stripeAccountStatus: {
    type: String,
    enum: ["unconnected", "pending", "active", "restricted"],
  },

  chargesEnabled: {
    type: Boolean,
  },

  payoutsEnabled: {
    type: Boolean,
  },

  maskedBank: {
    type: String,
    trim: true,
  },
});

UserSchema.pre("save", function () {
  if (this.role !== "PROFESSIONAL") {
    this.professionalType = undefined;
    this.specialization = undefined;
    this.experience = undefined;
    this.sessionFee = undefined;
    this.profilePhoto = undefined;
    this.bio = undefined;
    this.rating = undefined;
    this.credentialDocs = undefined;
    this.availability = undefined;

    this.professionalStatus = undefined;
    this.rejectionReason = undefined;
    this.verificationMeetingLink = undefined;
    this.verificationMeetingTime = undefined;
    this.verificationNotes = undefined;
    this.appliedAt = undefined;

    this.stripeAccountId = undefined;
    this.stripeAccountStatus = undefined;
    this.chargesEnabled = undefined;
    this.payoutsEnabled = undefined;
    this.maskedBank = undefined;
  }
});

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;