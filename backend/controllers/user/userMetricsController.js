const mongoose = require("mongoose");
const UserMetrics = require("../../models/userMetrics");

const {
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  calculateGoalCalories,
  calculateMacros,
  calculateWaterIntake,
} = require("../../utils/calc");

const UserMetricsController = {
  // =====================================================
  // SAVE / UPDATE USER METRICS
  // =====================================================

  save: async (req, res) => {
    try {
      const { userId } = req.params;

      const {
        weight,
        height,
        age,
        gender,
        goal,
        activityLevel,
        dietPref,
        diabetes,
        allergiesNuts,
      } = req.body;

      console.log("=================================");
      console.log("USER METRICS SAVE API");
      console.log("USER ID:", userId);
      console.log("BODY:", req.body);
      console.log("=================================");

      // -------------------------------------------------
      // VALIDATE USER ID
      // -------------------------------------------------

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      // -------------------------------------------------
      // VALIDATE REQUIRED INPUTS
      // -------------------------------------------------

      if (
        weight === undefined ||
        height === undefined ||
        age === undefined ||
        !gender ||
        !goal ||
        !activityLevel
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Weight, height, age, gender, goal and activity level are required",
        });
      }

      if (Number(weight) <= 0 || Number(height) <= 0 || Number(age) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Weight, height and age must be greater than 0",
        });
      }

      // -------------------------------------------------
      // BACKEND CALCULATIONS
      // -------------------------------------------------

      const numericWeight = Number(weight);
      const numericHeight = Number(height);
      const numericAge = Number(age);

      // BMI
      const bmi = calculateBMI(numericWeight, numericHeight);

      // BMR
      const bmr = calculateBMR(
        numericWeight,
        numericHeight,
        numericAge,
        gender,
      );

      // TDEE
      const tdee = calculateTDEE(bmr, activityLevel);

      // Goal Calories
      const goalCalories = calculateGoalCalories(tdee, goal);

      // Macros
      const macros = calculateMacros(goalCalories);

      // Water Intake
      const waterIntake = calculateWaterIntake(numericWeight, activityLevel);

      // -------------------------------------------------
      // LOG CALCULATIONS
      // -------------------------------------------------

      console.log("=================================");
      console.log("CALCULATED VALUES");
      console.log("=================================");

      console.log("BMI:", bmi);
      console.log("BMR:", bmr);
      console.log("TDEE:", tdee);
      console.log("GOAL CALORIES:", goalCalories);
      console.log("MACROS:", macros);
      console.log("WATER INTAKE:", waterIntake);

      console.log("=================================");

      // -------------------------------------------------
      // SAVE / UPDATE
      // -------------------------------------------------

      const savedMetrics = await UserMetrics.findOneAndUpdate(
        {
          userId,
        },

        {
          $set: {
            userId,

            weight: numericWeight,
            height: numericHeight,
            age: numericAge,

            gender,
            goal,
            activityLevel,

            dietPref: dietPref || "non-veg",

            diabetes: Boolean(diabetes),

            allergiesNuts: Boolean(allergiesNuts),

            // BACKEND CALCULATED VALUES
            bmi,
            bmr,
            tdee,
            goalCalories,
            macros,

            // WATER
            waterIntake,
          },
        },

        {
          new: true,
          upsert: true,
          runValidators: true,
        },
      );

      console.log("=================================");
      console.log("SAVED METRICS:");
      console.log(savedMetrics);
      console.log("=================================");

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(200).json({
        success: true,
        message: "User metrics saved successfully",
        data: savedMetrics,
      });
    } catch (error) {
      console.error("=================================");
      console.error("USER METRICS SAVE ERROR");
      console.error(error);
      console.error("=================================");

      return res.status(500).json({
        success: false,
        message: "Failed to save user metrics",
        error: error.message,
      });
    }
  },

  // =====================================================
  // GET USER METRICS
  // =====================================================

  get: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const metrics = await UserMetrics.findOne({
        userId,
      });

      if (!metrics) {
        return res.status(404).json({
          success: false,
          message: "No metrics found for this user",
        });
      }

      return res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("GET USER METRICS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get user metrics",
        error: error.message,
      });
    }
  },

  // =====================================================
  // GENERATE DIET PLAN
  // =====================================================

  generateDietPlan: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const metrics = await UserMetrics.findOne({
        userId,
      });

      if (!metrics) {
        return res.status(404).json({
          success: false,
          message: "User metrics not found",
        });
      }

      // -------------------------------------------------
      // CURRENT BASIC DIET PLAN
      // -------------------------------------------------

      const dietPlan = {
        breakfast: "Oats + milk",
        lunch: "Grilled chicken + salad",
        dinner: "Vegetable stir fry",
      };

      return res.status(200).json({
        success: true,
        message: "Diet plan generated successfully",

        data: {
          dietPlan,

          // Send calculations along with diet plan
          calories: metrics.goalCalories,

          macros: metrics.macros,

          waterIntake: metrics.waterIntake,
        },
      });
    } catch (error) {
      console.error("GENERATE DIET PLAN ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to generate diet plan",
        error: error.message,
      });
    }
  },
};

module.exports = UserMetricsController;
