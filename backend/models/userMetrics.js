const mongoose = require("mongoose");

// ============================================
// MACROS SCHEMA
// ============================================

const macrosSchema = new mongoose.Schema(
  {
    carbs: {
      type: Number,
      required: true,
    },

    protein: {
      type: Number,
      required: true,
    },

    fat: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
  },
);

// ============================================
// WATER INTAKE SCHEMA
// ============================================

const waterIntakeSchema = new mongoose.Schema(
  {
    // Daily water in milliliters
    ml: {
      type: Number,
      required: true,
    },

    // Daily water in liters
    liters: {
      type: Number,
      required: true,
    },

    // Approximate 250ml glasses
    glasses: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
  },
);

// ============================================
// USER METRICS SCHEMA
// ============================================

const UserMetricsSchema = new mongoose.Schema(
  {
    // ------------------------------------------
    // USER
    // ------------------------------------------

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: "User",
    },

    // ------------------------------------------
    // BASIC HEALTH INFORMATION
    // ------------------------------------------

    weight: {
      type: Number,
      required: true,
      min: 1,
    },

    // Height is stored in CENTIMETERS
    height: {
      type: Number,
      required: true,
      min: 1,
    },

    age: {
      type: Number,
      required: true,
      min: 1,
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female"],
    },

    // ------------------------------------------
    // FITNESS INFORMATION
    // ------------------------------------------

    goal: {
      type: String,
      required: true,
      enum: ["lose weight", "maintain weight", "gain weight"],
    },

    activityLevel: {
      type: String,
      required: true,
      enum: ["sedentary", "light", "moderate", "active", "very active"],
    },

    // ------------------------------------------
    // DIET PREFERENCES
    // ------------------------------------------

    dietPref: {
      type: String,
      required: true,
      enum: ["veg", "non-veg"],
    },

    diabetes: {
      type: Boolean,
      default: false,
    },

    allergiesNuts: {
      type: Boolean,
      default: false,
    },

    // ------------------------------------------
    // BACKEND CALCULATED VALUES
    // ------------------------------------------

    bmi: {
      type: Number,
    },

    bmr: {
      type: Number,
    },

    tdee: {
      type: Number,
    },

    goalCalories: {
      type: Number,
    },

    macros: {
      type: macrosSchema,
    },

    // ------------------------------------------
    // DAILY WATER INTAKE
    // ------------------------------------------

    waterIntake: {
      type: waterIntakeSchema,
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("UserMetrics", UserMetricsSchema);
