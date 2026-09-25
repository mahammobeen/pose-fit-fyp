function calculateBMI(weight, heightCm) {
  const heightM = heightCm / 100;

  if (heightM <= 0) {
    throw new Error("Invalid height");
  }

  return +(weight / (heightM * heightM)).toFixed(2);
}

function calculateBMR(weight, heightCm, age, gender) {
  const normalizedGender = gender.toLowerCase();

  if (normalizedGender === "male") {
    return +(10 * weight + 6.25 * heightCm - 5 * age + 5).toFixed(2);
  }

  return +(10 * weight + 6.25 * heightCm - 5 * age - 161).toFixed(2);
}

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

function calculateMacros(calories, goal = "") {
  const normalizedGoal = String(goal || "")
    .trim()
    .toLowerCase();

  let proteinRatio = 0.3;
  let carbsRatio = 0.4;
  let fatRatio = 0.3;

  if (normalizedGoal === "lose weight") {
    proteinRatio = 0.3;
    carbsRatio = 0.4;
    fatRatio = 0.3;
  } else if (normalizedGoal === "gain weight") {
    proteinRatio = 0.25;
    carbsRatio = 0.5;
    fatRatio = 0.25;
  } else if (normalizedGoal === "maintain weight") {
    proteinRatio = 0.25;
    carbsRatio = 0.45;
    fatRatio = 0.3;
  }

  return {
    carbs: +((calories * carbsRatio) / 4).toFixed(2),
    protein: +((calories * proteinRatio) / 4).toFixed(2),
    fat: +((calories * fatRatio) / 9).toFixed(2),
  };
}

function getBMICategory(bmi) {
  const num = Number(bmi);
  if (!Number.isFinite(num) || num <= 0) return "Unknown";
  if (num < 18.5) return "Underweight";
  if (num < 25) return "Normal";
  if (num < 30) return "Overweight";
  return "Obese";
}

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
  getBMICategory,
  calculateWaterIntake,
};
