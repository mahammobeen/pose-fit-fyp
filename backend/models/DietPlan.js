const mongoose = require("mongoose");

const mealItemSchema = new mongoose.Schema(
  {
    food_id: { type: Number, required: true },
    dish_name: { type: String, required: true },
    portion_multiplier: { type: Number, default: 1.0 },
    portion_grams: { type: Number, required: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fats: { type: Number, required: true },
  },
  { _id: false }
);

const mealSlotSchema = new mongoose.Schema(
  {
    slot_name: { type: String, required: true },
    items: [mealItemSchema],
    total_calories: { type: Number, required: true },
    total_protein: { type: Number, required: true },
    total_carbs: { type: Number, required: true },
    total_fats: { type: Number, required: true },
    target_calories: { type: Number },
    target_protein: { type: Number },
    target_carbs: { type: Number },
    target_fats: { type: Number },
    calorie_error_pct: { type: Number },
  },
  { _id: false }
);

const dailyTotalsSchema = new mongoose.Schema(
  {
    calories: { type: Number, required: true },
    protein_g: { type: Number, required: true },
    carbs_g: { type: Number, required: true },
    fats_g: { type: Number, required: true },
  },
  { _id: false }
);

const dayPlanSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    meals: {
      breakfast: { type: mealSlotSchema, required: true },
      lunch: { type: mealSlotSchema, required: true },
      dinner: { type: mealSlotSchema, required: true },
      snack: { type: mealSlotSchema, required: true },
    },
    daily_totals: { type: dailyTotalsSchema, required: true },
    target_totals: { type: dailyTotalsSchema },
    error_percentages: {
      calories_error_pct: { type: Number },
      protein_error_pct: { type: Number },
      carbs_error_pct: { type: Number },
      fats_error_pct: { type: Number },
    },
  },
  { _id: false }
);

const DietPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    metricsSnapshot: {
      age: Number,
      height: Number,
      weight: Number,
      gender: String,
      goal: String,
      activityLevel: String,
      bmiValue: Number,
      bmiCategory: String,
      bmr: Number,
      tdee: Number,
      targetCalories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
    },
    fitnessGoal: {
      type: String,
      required: true,
    },
    targetDailyCalories: {
      type: Number,
      required: true,
    },
    targetDailyMacros: {
      protein_g: { type: Number, required: true },
      carbs_g: { type: Number, required: true },
      fats_g: { type: Number, required: true },
    },
    planDays: {
      type: [dayPlanSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length === 3;
        },
        message: "A diet plan must contain exactly 3 days.",
      },
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DietPlan", DietPlanSchema);
