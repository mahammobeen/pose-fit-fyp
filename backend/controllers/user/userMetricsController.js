const mongoose = require("mongoose");
const UserMetrics = require("../../models/userMetrics");

const {
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  calculateGoalCalories,
  calculateMacros,
  calculateWaterIntake,
  getBMICategory,
} = require("../../utils/calc");
const DietPlan = require("../../models/DietPlan");

const UserMetricsController = {
  // =========================================================
  // SAVE / UPDATE USER METRICS
  // =========================================================
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

      console.log("---------");
      console.log("USER METRICS SAVE API");
      console.log("USER ID:", userId);
      console.log("BODY:", req.body);
      console.log("---------");

      // =====================================================
      // VALIDATE USER ID
      // =====================================================

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

      // =====================================================
      // VALIDATION
      // =====================================================

      const validGenders = ["male", "female"];

      const validActivityLevels = [
        "sedentary",
        "light",
        "moderate",
        "active",
        "very active",
      ];

      const validGoals = ["lose weight", "maintain weight", "gain weight"];

      const errors = {};

      // AGE
      if (age === undefined || age === null || age === "") {
        errors.age = "Age is required";
      } else {
        const numAge = Number(age);

        if (!Number.isInteger(numAge) || numAge < 16 || numAge > 50) {
          errors.age =
            "Age must be an integer between 16 and 50 years inclusive";
        }
      }

      // HEIGHT
      if (height === undefined || height === null || height === "") {
        errors.height = "Height is required";
      } else {
        const numHeight = Number(height);

        if (isNaN(numHeight) || numHeight < 100 || numHeight > 250) {
          errors.height = "Height must be between 100 and 250 cm inclusive";
        }
      }

      // WEIGHT
      if (weight === undefined || weight === null || weight === "") {
        errors.weight = "Weight is required";
      } else {
        const numWeight = Number(weight);

        if (isNaN(numWeight) || numWeight < 25 || numWeight > 200) {
          errors.weight = "Weight must be between 25 and 200 kg inclusive";
        }
      }

      // GENDER
      const normalizedGender = String(gender || "")
        .trim()
        .toLowerCase();

      if (!gender || !validGenders.includes(normalizedGender)) {
        errors.gender = "Gender must be either 'male' or 'female'";
      }

      // ACTIVITY LEVEL
      const normalizedActivity = String(activityLevel || "")
        .trim()
        .toLowerCase();

      if (!activityLevel || !validActivityLevels.includes(normalizedActivity)) {
        errors.activityLevel = `Activity level must be one of: ${validActivityLevels.join(
          ", ",
        )}`;
      }

      // GOAL
      const normalizedGoal = String(goal || "")
        .trim()
        .toLowerCase();

      if (!goal || !validGoals.includes(normalizedGoal)) {
        errors.goal = `Goal must be one of: ${validGoals.join(", ")}`;
      }

      // RETURN VALIDATION ERRORS
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed for health metrics input",
          errors,
        });
      }

      // =====================================================
      // BACKEND CALCULATIONS
      // =====================================================

      const numericWeight = Number(weight);
      const numericHeight = Number(height);
      const numericAge = Number(age);

      // BMI
      const bmi = calculateBMI(numericWeight, numericHeight);

      const bmiCategory = getBMICategory(bmi);

      // BMR
      const bmr = calculateBMR(
        numericWeight,
        numericHeight,
        numericAge,
        normalizedGender,
      );

      // TDEE
      const tdee = calculateTDEE(bmr, normalizedActivity);

      // GOAL CALORIES
      const goalCalories = calculateGoalCalories(tdee, normalizedGoal);

      // MACROS
      const macros = calculateMacros(goalCalories, normalizedGoal);

      // WATER
      const waterIntake = calculateWaterIntake(
        numericWeight,
        normalizedActivity,
      );

      // =====================================================
      // LOG CALCULATIONS
      // =====================================================

      console.log("---------");
      console.log("CALCULATED VALUES");
      console.log("BMI:", bmi, `(${bmiCategory})`);
      console.log("BMR:", bmr);
      console.log("TDEE:", tdee);
      console.log("GOAL CALORIES:", goalCalories);
      console.log("MACROS:", macros);
      console.log("WATER INTAKE:", waterIntake);
      console.log("---------");

      // =====================================================
      // SAVE / UPDATE USER METRICS
      // =====================================================

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

            gender: normalizedGender,
            goal: normalizedGoal,
            activityLevel: normalizedActivity,

            dietPref: dietPref || "non-veg",

            diabetes: Boolean(diabetes),

            allergiesNuts: Boolean(allergiesNuts),

            // CALCULATED VALUES
            bmi,
            bmiValue: bmi,
            bmiCategory,

            bmr,
            tdee,

            goalCalories,
            targetCalories: goalCalories,

            protein: macros.protein,
            carbs: macros.carbs,
            fats: macros.fat,

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

      console.log("---------");
      console.log("SAVED METRICS:");
      console.log(savedMetrics);
      console.log("---------");

      // =====================================================
      // DELETE OLD DIET PLAN
      // =====================================================
      //
      // Every time health metrics are recalculated,
      // the previous diet plan becomes invalid.
      //
      // The new metrics may produce different:
      // - calories
      // - macros
      // - BMI
      // - BMR
      // - TDEE
      // - fitness goal
      //
      // Therefore the old diet plan must be removed.
      // =====================================================

      const deletedDietPlan = await DietPlan.deleteOne({
        userId,
      });

      console.log("---------");
      console.log("OLD DIET PLAN CLEANUP");
      console.log("Deleted diet plans:", deletedDietPlan.deletedCount);
      console.log("---------");

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,
        message:
          "Health metrics calculated successfully. Previous diet plan has been removed.",
        data: savedMetrics,
        dietPlanDeleted: deletedDietPlan.deletedCount > 0,
      });
    } catch (error) {
      console.error("---------");
      console.error("USER METRICS SAVE ERROR");
      console.error(error);
      console.error("---------");

      return res.status(500).json({
        success: false,
        message: "Failed to save user metrics",
        error: error.message,
      });
    }
  },

  // =========================================================
  // GET USER METRICS
  // =========================================================
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
};

module.exports = UserMetricsController;
