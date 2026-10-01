const axios = require("axios");

const FASTAPI_BASE_URL =
  process.env.FASTAPI_DIET_URL || "http://127.0.0.1:8000";

const fastapiDietService = {
  checkHealth: async () => {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/health`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error("FastAPI health check failed:", error.message);
      return {
        status: "unreachable",
        error: error.message,
      };
    }
  },

  generateDietPlan: async ({
    targetCalories,
    protein_g,
    carbs_g,
    fats_g,
    fitnessGoal = "maintain weight",
    days = 3,
    excludeFoodIds = null,
    randomSeed = null,
  }) => {
    const payload = {
      target_calories: Number(targetCalories),
      protein_g: Number(protein_g),
      carbs_g: Number(carbs_g),
      fats_g: Number(fats_g),
      fitness_goal: String(fitnessGoal).trim().toLowerCase(),
      days: Number(days),
      exclude_food_ids:
        Array.isArray(excludeFoodIds) && excludeFoodIds.length > 0
          ? excludeFoodIds.map(Number)
          : null,
      random_seed:
        randomSeed !== undefined && randomSeed !== null
          ? Number(randomSeed)
          : null,
    };

    console.log("=================================");
    console.log("FASTAPI DIET PLAN REQUEST:");
    console.log(`URL: ${FASTAPI_BASE_URL}/generate-diet-plan`);
    console.log("PAYLOAD:", payload);
    console.log("=================================");

    let response;
    try {
      response = await axios.post(
        `${FASTAPI_BASE_URL}/generate-diet-plan`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        },
      );
    } catch (err) {
      console.error(
        "FastAPI Request Error:",
        err.response?.data || err.message,
      );
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Could not connect to the Diet Plan Recommendation Service.";
      const status = err.response?.status || 502;
      const error = new Error(`FastAPI service error (${status}): ${detail}`);
      error.statusCode = status;
      throw error;
    }

    const data = response.data;

    if (!data || data.status !== "success" || !Array.isArray(data.plan_days)) {
      throw new Error(
        "Invalid response received from the Diet Plan Recommendation Service.",
      );
    }

    if (data.plan_days.length !== days) {
      throw new Error(
        `Expected ${days} days in diet plan, but received ${data.plan_days.length}.`,
      );
    }

    const requiredSlots = ["breakfast", "lunch", "dinner", "snack"];

    for (const day of data.plan_days) {
      if (!day.meals || typeof day.meals !== "object") {
        throw new Error(
          `Day ${day.day} is missing meal slot definitions from recommendation service.`,
        );
      }

      for (const slot of requiredSlots) {
        const slotData = day.meals[slot];
        if (
          !slotData ||
          !Array.isArray(slotData.items) ||
          slotData.items.length === 0
        ) {
          throw new Error(
            `Day ${day.day} slot '${slot}' is missing recommended items.`,
          );
        }

        for (const item of slotData.items) {
          if (!item.dish_name || item.portion_grams === undefined) {
            throw new Error(
              `Item in Day ${day.day} slot '${slot}' is missing required dish or portion details.`,
            );
          }
        }
      }
    }

    return data;
  },
};

module.exports = fastapiDietService;
