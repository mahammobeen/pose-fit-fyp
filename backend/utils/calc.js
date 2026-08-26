/**
 * Calculate BMI
 * weight = kg
 * heightCm = cm
 */
function calculateBMI(weight, heightCm) {
  const heightM = heightCm / 100;

  if (heightM <= 0) {
    throw new Error("Invalid height");
  }

  return +(weight / (heightM * heightM)).toFixed(2);
}

/**
 * Mifflin-St Jeor BMR
 */
function calculateBMR(weight, heightCm, age, gender) {
  const normalizedGender = gender.toLowerCase();

  if (normalizedGender === "male") {
    return +(10 * weight + 6.25 * heightCm - 5 * age + 5).toFixed(2);
  }

  return +(10 * weight + 6.25 * heightCm - 5 * age - 161).toFixed(2);
}

/**
 * TDEE
 */
function calculateTDEE(bmr, activityLevel) {
  const factors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    "very active": 1.9,
  };

  const normalizedActivity = activityLevel.toLowerCase();

  const multiplier = factors[normalizedActivity] || 1.2;

  return +(bmr * multiplier).toFixed(2);
}

/**
 * Goal Calories
 *
 * lose weight     -> 500 kcal deficit
 * gain weight     -> 500 kcal surplus
 * maintain weight -> same as TDEE
 */
function calculateGoalCalories(tdee, goal) {
  const normalizedGoal = goal.toLowerCase();

  if (normalizedGoal === "lose weight") {
    return +(tdee - 500).toFixed(2);
  }

  if (normalizedGoal === "gain weight") {
    return +(tdee + 500).toFixed(2);
  }

  return +tdee.toFixed(2);
}

/**
 * Daily Macros
 *
 * 40% carbs
 * 30% protein
 * 30% fat
 */
function calculateMacros(calories) {
  return {
    carbs: +((calories * 0.4) / 4).toFixed(2),
    protein: +((calories * 0.3) / 4).toFixed(2),
    fat: +((calories * 0.3) / 9).toFixed(2),
  };
}

/**
 * =========================================================
 * DAILY WATER INTAKE
 * =========================================================
 *
 * Base calculation:
 *
 * weight × 35 ml
 *
 * Then activity level adjustment:
 *
 * sedentary    -> +0 ml
 * light        -> +250 ml
 * moderate     -> +500 ml
 * active       -> +750 ml
 * very active  -> +1000 ml
 *
 * Glass size = 250 ml
 *
 * Example:
 *
 * weight = 70 kg
 * activity = moderate
 *
 * 70 × 35 = 2450 ml
 * + 500 = 2950 ml
 *
 * 2950 / 250 = 11.8
 * ≈ 12 glasses
 */
function calculateWaterIntake(weight, activityLevel) {
  const baseWater = Number(weight) * 35;

  const activityWater = {
    sedentary: 0,
    light: 250,
    moderate: 500,
    active: 750,
    "very active": 1000,
  };

  const normalizedActivity = String(activityLevel || "").toLowerCase();

  const extraWater = activityWater[normalizedActivity] ?? 0;

  const totalWaterMl = baseWater + extraWater;

  const liters = totalWaterMl / 1000;

  const glasses = Math.round(totalWaterMl / 250);

  return {
    ml: Math.round(totalWaterMl),
    liters: +liters.toFixed(2),
    glasses,
  };
}

module.exports = {
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  calculateGoalCalories,
  calculateMacros,
  calculateWaterIntake,
};
