const mongoose = require("mongoose");
const UserMetrics = require("../../models/userMetrics");
const DietPlan = require("../../models/DietPlan");
const fastapiDietService = require("../../services/fastapiDietService");

function calculateDayExpiry(generatedAt) {
  const genDate = new Date(generatedAt || Date.now());
  const today = new Date();

  const startOfGen = new Date(
    genDate.getFullYear(),
    genDate.getMonth(),
    genDate.getDate(),
  );
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const diffTime = startOfToday.getTime() - startOfGen.getTime();
  const daysElapsed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  const isExpired = daysElapsed >= 3;
  const currentDay = isExpired ? null : daysElapsed + 1;

  return {
    daysElapsed,
    isExpired,
    currentDay,
  };
}

function extractFoodIds(planDays) {
  const ids = new Set();
  if (!Array.isArray(planDays)) return [];

  for (const day of planDays) {
    if (!day.meals) continue;
    for (const slotKey of ["breakfast", "lunch", "dinner", "snack"]) {
      const slot = day.meals[slotKey];
      if (slot && Array.isArray(slot.items)) {
        for (const item of slot.items) {
          if (item.food_id !== undefined && item.food_id !== null) {
            ids.add(Number(item.food_id));
          }
        }
      }
    }
  }

  return Array.from(ids);
}

function arePlansDuplicate(ids1, ids2) {
  if (!ids1.length || !ids2.length) return false;
  const set1 = new Set(ids1);
  const common = ids2.filter((id) => set1.has(id));
  const maxLen = Math.max(ids1.length, ids2.length);
  const overlapRatio = common.length / maxLen;
  return overlapRatio >= 0.8;
}

const dietPlanController = {
  generatePlan: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      const metrics = await UserMetrics.findOne({ userId });

      if (!metrics) {
        return res.status(404).json({
          success: false,
          message:
            "Health metrics not found. Please calculate your health metrics first before generating a diet plan.",
        });
      }

      const targetCalories = metrics.targetCalories || metrics.goalCalories;
      const protein_g = metrics.protein || metrics.macros?.protein;
      const carbs_g = metrics.carbs || metrics.macros?.carbs;
      const fats_g = metrics.fats || metrics.macros?.fat;
      const fitnessGoal = metrics.goal || "maintain weight";

      if (!targetCalories || !protein_g || !carbs_g || !fats_g) {
        return res.status(400).json({
          success: false,
          message:
            "Health metrics are incomplete. Please recalculate your health metrics.",
        });
      }

      const existingPlan = await DietPlan.findOne({ userId });
      const previousFoodIds = existingPlan
        ? extractFoodIds(existingPlan.planDays)
        : [];

      console.log(`GENERATING DIET PLAN FOR USER: ${userId}`);
      console.log(`Existing plan found: ${Boolean(existingPlan)}`);
      if (previousFoodIds.length) {
        console.log(`Previous food IDs count: ${previousFoodIds.length}`);
      }

      let newPlanData = await fastapiDietService.generateDietPlan({
        targetCalories,
        protein_g,
        carbs_g,
        fats_g,
        fitnessGoal,
        days: 3,
        excludeFoodIds: null,
        randomSeed: null,
      });

      if (previousFoodIds.length > 0) {
        let newFoodIds = extractFoodIds(newPlanData.plan_days);
        if (arePlansDuplicate(previousFoodIds, newFoodIds)) {
          console.log(
            "Plan similarity high on initial generation. Retrying with excluded previous dishes to guarantee fresh variation...",
          );
          try {
            const excludeSubset = previousFoodIds.slice(
              0,
              Math.min(15, previousFoodIds.length),
            );
            const retriedPlan = await fastapiDietService.generateDietPlan({
              targetCalories,
              protein_g,
              carbs_g,
              fats_g,
              fitnessGoal,
              days: 3,
              excludeFoodIds: excludeSubset,
              randomSeed: null,
            });

            const retriedIds = extractFoodIds(retriedPlan.plan_days);
            if (!arePlansDuplicate(previousFoodIds, retriedIds)) {
              newPlanData = retriedPlan;
              console.log("Fresh varied plan generated successfully on retry.");
            }
          } catch (retryErr) {
            console.warn(
              "Exclusion retry warning, falling back to initial valid plan:",
              retryErr.message,
            );
          }
        }
      }

      const metricsSnapshot = {
        age: metrics.age,
        height: metrics.height,
        weight: metrics.weight,
        gender: metrics.gender,
        goal: metrics.goal,
        activityLevel: metrics.activityLevel,
        bmiValue: metrics.bmiValue || metrics.bmi,
        bmiCategory: metrics.bmiCategory,
        bmr: metrics.bmr,
        tdee: metrics.tdee,
        targetCalories,
        protein: protein_g,
        carbs: carbs_g,
        fats: fats_g,
      };

      const now = new Date();
      const savedDietPlan = await DietPlan.findOneAndUpdate(
        { userId },
        {
          $set: {
            userId,
            metricsSnapshot,
            fitnessGoal,
            targetDailyCalories: targetCalories,
            targetDailyMacros: {
              protein_g,
              carbs_g,
              fats_g,
            },
            planDays: newPlanData.plan_days,
            generatedAt: now,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        },
      );

      console.log("DIET PLAN SAVED SUCCESSFULLY IN MONGODB");
      console.log("Generated At:", now);

      const dayExpiry = calculateDayExpiry(now);

      return res.status(200).json({
        success: true,
        message: existingPlan
          ? "Your diet plan has been regenerated successfully."
          : "Your personalized diet plan has been generated successfully.",
        data: {
          ...savedDietPlan.toObject(),
          daysElapsed: dayExpiry.daysElapsed,
          isExpired: dayExpiry.isExpired,
          currentDay: dayExpiry.currentDay,
        },
      });
    } catch (error) {
      console.error("DIET PLAN GENERATE ERROR:", error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to generate diet plan",
      });
    }
  },

  getCurrentPlan: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      const plan = await DietPlan.findOne({ userId });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "No diet plan found for this user",
        });
      }

      const dayExpiry = calculateDayExpiry(plan.generatedAt);

      return res.status(200).json({
        success: true,
        data: {
          ...plan.toObject(),
          daysElapsed: dayExpiry.daysElapsed,
          isExpired: dayExpiry.isExpired,
          currentDay: dayExpiry.currentDay,
        },
      });
    } catch (error) {
      console.error("GET CURRENT DIET PLAN ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve diet plan",
        error: error.message,
      });
    }
  },

  getTodayPlan: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required",
        });
      }

      const plan = await DietPlan.findOne({ userId });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "No diet plan found for this user",
        });
      }

      const dayExpiry = calculateDayExpiry(plan.generatedAt);

      if (dayExpiry.isExpired) {
        return res.status(200).json({
          success: true,
          isExpired: true,
          message:
            "Your 3-day diet plan has expired. Please regenerate a new plan.",
          daysElapsed: dayExpiry.daysElapsed,
          currentDay: null,
          meals: null,
        });
      }

      const currentDayNumber = dayExpiry.currentDay;
      const todayDayPlan = plan.planDays.find(
        (d) => d.day === currentDayNumber,
      );

      if (!todayDayPlan) {
        return res.status(404).json({
          success: false,
          message: `Day ${currentDayNumber} meals not found in current plan`,
        });
      }

      return res.status(200).json({
        success: true,
        isExpired: false,
        daysElapsed: dayExpiry.daysElapsed,
        currentDay: currentDayNumber,
        generatedAt: plan.generatedAt,
        fitnessGoal: plan.fitnessGoal,
        targetDailyCalories: plan.targetDailyCalories,
        meals: todayDayPlan.meals,
        dailyTotals: todayDayPlan.daily_totals,
        targetTotals: todayDayPlan.target_totals,
        errorPercentages: todayDayPlan.error_percentages,
      });
    } catch (error) {
      console.error("GET TODAY PLAN ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve today's diet plan",
        error: error.message,
      });
    }
  },
};

module.exports = dietPlanController;
