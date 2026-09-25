const mongoose = require("mongoose");

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

const waterIntakeSchema = new mongoose.Schema(
  {
    ml: {
      type: Number,
      required: true,
    },

    liters: {
      type: Number,
      required: true,
    },

    glasses: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const UserMetricsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: "User",
    },

    weight: {
      type: Number,
      required: true,
      min: 1,
    },

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

    bmi: {
      type: Number,
    },

    bmiValue: {
      type: Number,
    },

    bmiCategory: {
      type: String,
      enum: ["Underweight", "Normal", "Overweight", "Obese", "Unknown"],
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

    targetCalories: {
      type: Number,
    },

    protein: {
      type: Number,
    },

    carbs: {
      type: Number,
    },

    fats: {
      type: Number,
    },

    macros: {
      type: macrosSchema,
    },

    waterIntake: {
      type: waterIntakeSchema,
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("UserMetrics", UserMetricsSchema);
