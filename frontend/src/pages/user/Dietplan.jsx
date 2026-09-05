import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Utensils,
  Flame,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
  Scale,
  HeartPulse,
} from "lucide-react";
import UserLayout from "../../components/user/UserLayout";
import { httpClient } from "../../lib/http";

import breakfastImg from "../../assets/breakfast.jpg";
import lunchImg from "../../assets/lunch.jpg";
import dinnerImg from "../../assets/dinner.jpg";
import snackImg from "../../assets/snack.jpg";

const MEAL_CATEGORY_IMAGES = {
  Breakfast: breakfastImg,
  breakfast: breakfastImg,
  BREAKFAST: breakfastImg,
  Lunch: lunchImg,
  lunch: lunchImg,
  LUNCH: lunchImg,
  Dinner: dinnerImg,
  dinner: dinnerImg,
  DINNER: dinnerImg,
  Snack: snackImg,
  snack: snackImg,
  SNACK: snackImg,
};

export default function DietPlan() {
  const [userId, setUserId] = useState(null);

  // 6 User Inputs
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("");

  // Health Metrics
  const [metrics, setMetrics] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);

  // Active Tab for 3-day view (1, 2, or 3)
  const [selectedDay, setSelectedDay] = useState(1);

  // UI States
  const [loading, setLoading] = useState(true);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [errors, setErrors] = useState({});

  // Helper to read logged-in userId
  const getUserId = () => {
    try {
      const stored = localStorage.getItem("pose-fit-user");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return (
        parsed?._id ||
        parsed?.id ||
        parsed?.userId ||
        parsed?.user?._id ||
        parsed?.user?.id
      );
    } catch (e) {
      console.error("Failed to parse pose-fit-user:", e);
      return null;
    }
  };

  // Populate state from loaded metrics
  const populateMetrics = (data) => {
    if (!data) return;
    setMetrics(data);
    if (data.age !== undefined && data.age !== null) setAge(String(data.age));
    if (data.height !== undefined && data.height !== null)
      setHeight(String(data.height));
    if (data.weight !== undefined && data.weight !== null)
      setWeight(String(data.weight));
    if (data.gender) setGender(data.gender);
    if (data.activityLevel) setActivityLevel(data.activityLevel);
    if (data.goal) setGoal(data.goal);
  };

  // Load User Metrics and Active Diet Plan
  useEffect(() => {
    const init = async () => {
      const id = getUserId();
      if (!id) {
        setLoading(false);
        toast.error("User session not found. Please log in again.");
        return;
      }
      setUserId(id);

      try {
        setLoading(true);
        // Load metrics
        try {
          const metricsRes = await httpClient.get(`/user/user-metrics/${id}`);
          if (metricsRes.data?.data) {
            populateMetrics(metricsRes.data.data);
          }
        } catch (err) {
          if (err?.response?.status !== 404) {
            console.error("Error loading metrics:", err);
          }
        }

        // Load active diet plan
        try {
          const planRes = await httpClient.get(`/user/diet-plan/${id}`);
          if (planRes.data?.data) {
            setDietPlan(planRes.data.data);
            if (planRes.data.data.currentDay) {
              setSelectedDay(planRes.data.data.currentDay);
            }
          }
        } catch (err) {
          if (err?.response?.status !== 404) {
            console.error("Error loading diet plan:", err);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Strict Validation (Age 16–50, Height 100–250, Weight 25–200, Gender, Activity, Goal)
  const validate = () => {
    const newErrors = {};

    // Age
    if (!age || age.trim() === "") {
      newErrors.age = "Age is required";
    } else {
      const numAge = Number(age);
      if (!Number.isInteger(numAge) || numAge < 16 || numAge > 50) {
        newErrors.age = "Age must be between 16 and 50 years inclusive";
      }
    }

    // Height
    if (!height || height.trim() === "") {
      newErrors.height = "Height is required";
    } else {
      const numHeight = Number(height);
      if (isNaN(numHeight) || numHeight < 100 || numHeight > 250) {
        newErrors.height = "Height must be between 100 and 250 cm inclusive";
      }
    }

    // Weight
    if (!weight || weight.trim() === "") {
      newErrors.weight = "Weight is required";
    } else {
      const numWeight = Number(weight);
      if (isNaN(numWeight) || numWeight < 25 || numWeight > 200) {
        newErrors.weight = "Weight must be between 25 and 200 kg inclusive";
      }
    }

    // Gender
    if (!gender) {
      newErrors.gender = "Please select your gender";
    }

    // Activity Level
    if (!activityLevel) {
      newErrors.activityLevel = "Please select your activity level";
    }

    // Goal
    if (!goal) {
      newErrors.goal = "Please select your fitness goal";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save / Recalculate Health Metrics
  const handleSaveMetrics = async (e) => {
    if (e) e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the validation errors in the form.");
      return;
    }

    const currentId = userId || getUserId();
    if (!currentId) {
      toast.error("User session missing. Please log in again.");
      return;
    }

    try {
      setSavingMetrics(true);
      const payload = {
        age: Number(age),
        height: Number(height),
        weight: Number(weight),
        gender,
        activityLevel,
        goal,
      };

      const res = await httpClient.post(
        `/user/user-metrics/${currentId}`,
        payload
      );

      const saved = res.data?.data;
      if (!saved) {
        throw new Error("Server did not return saved metrics");
      }

      populateMetrics(saved);
      toast.success(
        "Health metrics calculated and saved successfully!"
      );
    } catch (err) {
      console.error("Save metrics error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save health metrics.";
      toast.error(msg);
    } finally {
      setSavingMetrics(false);
    }
  };

  // Generate or Regenerate Diet Plan
  const handleGeneratePlan = async () => {
    const currentId = userId || getUserId();
    if (!currentId) {
      toast.error("User session missing. Please log in again.");
      return;
    }

    if (!metrics) {
      toast.error(
        "Please calculate and save your Health Metrics first before generating a plan."
      );
      return;
    }

    try {
      setGeneratingPlan(true);
      const res = await httpClient.post(`/user/diet-plan/${currentId}`);
      const planData = res.data?.data;

      if (!planData) {
        throw new Error("Did not receive generated plan from server");
      }

      setDietPlan(planData);
      if (planData.currentDay) {
        setSelectedDay(planData.currentDay);
      } else {
        setSelectedDay(1);
      }

      // Notify dashboard and other components to update
      window.dispatchEvent(new CustomEvent("diet-plan-updated"));

      toast.success(
        dietPlan
          ? "Your 3-day diet plan has been regenerated!"
          : "Your 3-day personalized diet plan has been generated!"
      );
    } catch (err) {
      console.error("Generate plan error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate diet plan. Please ensure the recommendation service is active.";
      toast.error(msg);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-500">
              Loading your diet plan & health metrics...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  const currentDayData =
    dietPlan?.planDays?.find((d) => d.day === selectedDay) ||
    dietPlan?.planDays?.[0];

  return (
    <UserLayout>
      <main className="min-h-screen px-4 py-6 sm:px-6 md:px-8 space-y-8 font-sans">
        {/* HEADER */}
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
                Personalized
                <span className="rounded-btn bg-brand-light/40 px-3 py-1 text-brand-dark">
                  Diet Planner
                </span>
              </h1>
              <p className="mt-2 text-xs font-medium text-gray-500 sm:text-sm">
                Calculate your precise nutritional targets and generate an
                authentic 3-day Pakistani meal plan optimized by our ML model.
              </p>
            </div>
          </div>
        </div>

        {/* TOP SECTION: FORM (LEFT) + HEALTH METRICS (RIGHT) */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* USER INPUT FORM (6 Inputs) */}
          <section className="lg:col-span-6 card bg-surface/85 border-brand-light/40 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-brand-light/35 rounded-btn">
                <Scale className="w-5 h-5 text-brand-dark" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-800">
                  Health Information
                </h2>
                <p className="text-xs text-gray-400">
                  Enter your physical parameters to compute BMI, BMR, TDEE, & Macros.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMetrics} className="space-y-5">
              {/* Age / Height / Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Age */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Age (yrs)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      if (errors.age) setErrors((prev) => ({ ...prev, age: "" }));
                    }}
                    placeholder="16 - 50"
                    className="w-full rounded-btn border border-gray-200 bg-white/80 px-3.5 py-3 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {errors.age && (
                    <p className="text-xs text-red-500 mt-1.5 font-semibold">
                      {errors.age}
                    </p>
                  )}
                </div>

                {/* Height */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => {
                      setHeight(e.target.value);
                      if (errors.height)
                        setErrors((prev) => ({ ...prev, height: "" }));
                    }}
                    placeholder="100 - 250"
                    className="w-full rounded-btn border border-gray-200 bg-white/80 px-3.5 py-3 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {errors.height && (
                    <p className="text-xs text-red-500 mt-1.5 font-semibold">
                      {errors.height}
                    </p>
                  )}
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => {
                      setWeight(e.target.value);
                      if (errors.weight)
                        setErrors((prev) => ({ ...prev, weight: "" }));
                    }}
                    placeholder="25 - 200"
                    className="w-full rounded-btn border border-gray-200 bg-white/80 px-3.5 py-3 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {errors.weight && (
                    <p className="text-xs text-red-500 mt-1.5 font-semibold">
                      {errors.weight}
                    </p>
                  )}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["male", "female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGender(g);
                        if (errors.gender)
                          setErrors((prev) => ({ ...prev, gender: "" }));
                      }}
                      className={`py-3 px-4 rounded-btn border font-bold capitalize text-sm transition-all ${
                        gender === g
                          ? "border-brand-dark bg-brand-light/40 text-brand-dark shadow-xs"
                          : "border-gray-200 bg-white/70 text-gray-600 hover:bg-white"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-xs text-red-500 mt-1.5 font-semibold">
                    {errors.gender}
                  </p>
                )}
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => {
                    setActivityLevel(e.target.value);
                    if (errors.activityLevel)
                      setErrors((prev) => ({ ...prev, activityLevel: "" }));
                  }}
                  className="w-full rounded-btn border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                >
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary (little to no exercise)</option>
                  <option value="light">Light (light exercise 1-3 days/wk)</option>
                  <option value="moderate">Moderate (moderate exercise 3-5 days/wk)</option>
                  <option value="active">Active (hard exercise 6-7 days/wk)</option>
                  <option value="very active">Very Active (intense daily exercise)</option>
                </select>
                {errors.activityLevel && (
                  <p className="text-xs text-red-500 mt-1.5 font-semibold">
                    {errors.activityLevel}
                  </p>
                )}
              </div>

              {/* Fitness Goal */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Fitness Goal
                </label>
                <select
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);
                    if (errors.goal)
                      setErrors((prev) => ({ ...prev, goal: "" }));
                  }}
                  className="w-full rounded-btn border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                >
                  <option value="">Select your goal</option>
                  <option value="lose weight">Weight Loss (500 kcal deficit)</option>
                  <option value="maintain weight">Maintain Weight (equipoise)</option>
                  <option value="gain weight">Weight Gain (500 kcal surplus)</option>
                </select>
                {errors.goal && (
                  <p className="text-xs text-red-500 mt-1.5 font-semibold">
                    {errors.goal}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={savingMetrics}
                className="w-full py-3.5 rounded-btn bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm shadow-card transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingMetrics ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Calculating & Saving...
                  </span>
                ) : metrics ? (
                  "Recalculate Health Metrics"
                ) : (
                  "Calculate Health Metrics"
                )}
              </button>
            </form>
          </section>

          {/* HEALTH METRICS RESULTS CARD */}
          <section className="lg:col-span-6 card bg-surface/85 border-brand-light/40 p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent-blue/35 rounded-btn">
                <HeartPulse className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-800">
                  Calculated Targets
                </h2>
                <p className="text-xs text-gray-400">
                  {metrics
                    ? "Updated from your latest health metrics."
                    : "Enter and save your metrics on the left to see your targets."}
                </p>
              </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* BMI */}
              <div className="bg-brand-light/15 rounded-btn p-4 border border-brand-light/30">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  BMI
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-800 mt-1">
                  {metrics?.bmiValue || metrics?.bmi
                    ? Number(metrics?.bmiValue || metrics?.bmi).toFixed(1)
                    : "--"}
                </p>
                <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-light/40 text-brand-dark">
                  {metrics?.bmiCategory || "--"}
                </span>
              </div>

              {/* BMR */}
              <div className="bg-accent-blue/15 rounded-btn p-4 border border-accent-blue/30">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  BMR
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-800 mt-1">
                  {metrics?.bmr ? Math.round(metrics.bmr) : "--"}
                </p>
                <p className="text-[11px] text-gray-500 font-medium mt-1">
                  kcal / day (Basal)
                </p>
              </div>

              {/* TDEE */}
              <div className="bg-accent-orange/15 rounded-btn p-4 border border-accent-orange/30">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  TDEE
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-800 mt-1">
                  {metrics?.tdee ? Math.round(metrics.tdee) : "--"}
                </p>
                <p className="text-[11px] text-gray-500 font-medium mt-1">
                  kcal / day (Maintenance)
                </p>
              </div>

              {/* Target Calories */}
              <div className="bg-brand-light/25 rounded-btn p-4 border border-brand-light/40">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">
                  Target Calories
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-800 mt-1">
                  {metrics?.targetCalories || metrics?.goalCalories
                    ? Math.round(metrics.targetCalories || metrics.goalCalories)
                    : "--"}
                </p>
                <p className="text-[11px] text-brand-dark font-medium mt-1 capitalize">
                  {metrics?.goal || "Goal Target"}
                </p>
              </div>
            </div>

            {/* Macro Targets */}
            <div>
              <h3 className="text-sm font-extrabold text-gray-800 mb-3 uppercase tracking-wider">
                Daily Macronutrient Targets
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-btn bg-brand-light/20 border border-brand-light/35">
                  <span className="block text-[11px] font-bold text-gray-500 uppercase">
                    Protein
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-brand-dark">
                    {metrics?.protein || metrics?.macros?.protein
                      ? `${Math.round(metrics.protein || metrics.macros.protein)}g`
                      : "--"}
                  </span>
                </div>

                <div className="p-3.5 rounded-btn bg-accent-blue/20 border border-accent-blue/35">
                  <span className="block text-[11px] font-bold text-gray-500 uppercase">
                    Carbs
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-blue-700">
                    {metrics?.carbs || metrics?.macros?.carbs
                      ? `${Math.round(metrics.carbs || metrics.macros.carbs)}g`
                      : "--"}
                  </span>
                </div>

                <div className="p-3.5 rounded-btn bg-accent-orange/20 border border-accent-orange/35">
                  <span className="block text-[11px] font-bold text-gray-500 uppercase">
                    Fats
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-accent-orange-dark">
                    {metrics?.fats || metrics?.macros?.fat
                      ? `${Math.round(metrics.fats || metrics.macros.fat)}g`
                      : "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* GENERATE BUTTON */}
            <div className="pt-2 border-t border-brand-light/30">
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={generatingPlan || !metrics}
                className="w-full py-4 rounded-btn bg-gray-800 hover:bg-gray-700 text-white font-extrabold text-sm shadow-card transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generatingPlan ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating 3-Day Plan with AI Model...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate 3-Day Diet Plan
                  </>
                )}
              </button>
              {!metrics && (
                <p className="text-[11px] text-center text-gray-400 mt-2">
                  Please calculate and save your health metrics above first.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* 3-DAY DIET PLAN SECTION */}
        {dietPlan && (
          <section className="max-w-6xl mx-auto space-y-6">
            {/* EXPIRY BANNER */}
            {dietPlan.isExpired && (
              <div className="p-5 rounded-card bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-btn text-amber-700">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-900">
                      Your 3-Day Diet Plan Has Expired
                    </h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Completed Day 3. Regenerate your plan to receive fresh meals for the next 3 days!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan}
                  className="rounded-btn bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2.5 transition-all shadow-xs"
                >
                  Regenerate New Plan
                </button>
              </div>
            )}

            {/* DAY TABS */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-light/30 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-800">
                  Your 3-Day Meal Plan
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Goal: <span className="font-bold capitalize text-brand-dark">{dietPlan.fitnessGoal}</span> • Daily Target:{" "}
                  <span className="font-bold text-gray-800">
                    {Math.round(dietPlan.targetDailyCalories)} kcal
                  </span>
                </p>
              </div>

              {/* Day Selector Tabs */}
              <div className="flex items-center gap-2 bg-surface/90 p-1.5 rounded-btn border border-brand-light/40 shadow-xs">
                {[1, 2, 3].map((dayNum) => {
                  const isToday = dietPlan.currentDay === dayNum;
                  const isSelected = selectedDay === dayNum;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedDay(dayNum)}
                      className={`px-4 py-2 rounded-btn text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-brand text-white shadow-xs"
                          : "text-gray-600 hover:bg-brand-light/20"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Day {dayNum}
                      {isToday && (
                        <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-white text-brand-dark uppercase tracking-wider font-black">
                          Today
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 MEAL CARDS (2 CARDS PER ROW GRID ON DESKTOP) */}
            {currentDayData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {["breakfast", "lunch", "dinner", "snack"].map((slotKey) => {
                    const slot = currentDayData.meals?.[slotKey];
                    if (!slot) return null;

                    const title = slot.slot_name || slotKey.toUpperCase();
                    const categoryImage =
                      MEAL_CATEGORY_IMAGES[title] || MEAL_CATEGORY_IMAGES.Lunch;

                    return (
                      <div
                        key={slotKey}
                        className="group flex flex-col justify-between overflow-hidden rounded-card border border-brand-light/50 bg-surface/85 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                      >
                        {/* Meal Category Image Banner */}
                        <div className="relative h-44 w-full overflow-hidden bg-brand-light/20">
                          <img
                            src={categoryImage}
                            alt={title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                          {/* Slot Badge */}
                          <div className="absolute top-4 left-4">
                            <span className="rounded-btn border border-white/40 bg-surface/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-gray-800 shadow-card backdrop-blur-md">
                              {title}
                            </span>
                          </div>

                          {/* Slot Total Calories */}
                          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                            <h3 className="font-extrabold text-xl">{title}</h3>
                            <span className="rounded-btn bg-brand px-2.5 py-1 text-xs font-black">
                              {slot.total_calories} kcal
                            </span>
                          </div>
                        </div>

                        {/* Card Body: Recommended Dishes with Portions & Nutrition */}
                        <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                          {/* Recommended Dish Items */}
                          <div className="space-y-2.5">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                              Recommended Dish(es) & Portion Size
                            </p>
                            {slot.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-btn bg-white/90 border border-brand-light/30 flex items-center justify-between gap-3 shadow-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-sm text-gray-800 truncate">
                                    {item.dish_name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                    {/* EXPLICIT PORTION SIZE FOR EVERY MEAL SLOT (INCLUDING SNACK) */}
                                    <span className="font-extrabold text-brand-dark bg-brand-light/30 px-2 py-0.5 rounded-btn text-[11px]">
                                      Portion: {item.portion_grams}g
                                    </span>
                                    <span>•</span>
                                    <span>{item.calories} kcal</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Slot Macro Breakdown */}
                          <div className="pt-3 border-t border-brand-light/30">
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div className="p-2 rounded-btn bg-brand-light/15">
                                <span className="block text-[10px] uppercase font-bold text-gray-400">
                                  Calories
                                </span>
                                <span className="text-xs font-extrabold text-gray-800">
                                  {slot.total_calories}
                                </span>
                              </div>
                              <div className="p-2 rounded-btn bg-brand-light/15">
                                <span className="block text-[10px] uppercase font-bold text-gray-400">
                                  Protein
                                </span>
                                <span className="text-xs font-extrabold text-brand-dark">
                                  {slot.total_protein}g
                                </span>
                              </div>
                              <div className="p-2 rounded-btn bg-accent-blue/15">
                                <span className="block text-[10px] uppercase font-bold text-gray-400">
                                  Carbs
                                </span>
                                <span className="text-xs font-extrabold text-blue-700">
                                  {slot.total_carbs}g
                                </span>
                              </div>
                              <div className="p-2 rounded-btn bg-accent-orange/15">
                                <span className="block text-[10px] uppercase font-bold text-gray-400">
                                  Fats
                                </span>
                                <span className="text-xs font-extrabold text-accent-orange-dark">
                                  {slot.total_fats}g
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DAILY COMPLIANCE SUMMARY */}
                <div className="card bg-surface/85 border-brand-light/40 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-800">
                        Day {selectedDay} Nutrition Summary
                      </h3>
                      <p className="text-xs text-gray-400">
                        Actual daily recommended totals vs your target requirements.
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-light/40 text-brand-dark border border-brand-light/60">
                      Day {selectedDay} Compliance
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Calorie Compliance */}
                    <div className="bg-brand-light/20 rounded-btn p-4 border border-brand-light/35">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Calories
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-gray-800 mt-1">
                        {currentDayData.daily_totals?.calories}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Target: {currentDayData.target_totals?.calories} kcal
                      </p>
                    </div>

                    {/* Protein Compliance */}
                    <div className="bg-brand-light/20 rounded-btn p-4 border border-brand-light/35">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">
                        Protein
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-gray-800 mt-1">
                        {currentDayData.daily_totals?.protein_g}g
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Target: {currentDayData.target_totals?.protein_g}g
                      </p>
                    </div>

                    {/* Carbs Compliance */}
                    <div className="bg-accent-blue/20 rounded-btn p-4 border border-accent-blue/35">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                        Carbohydrates
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-gray-800 mt-1">
                        {currentDayData.daily_totals?.carbs_g}g
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Target: {currentDayData.target_totals?.carbs_g}g
                      </p>
                    </div>

                    {/* Fat Compliance */}
                    <div className="bg-accent-orange/20 rounded-btn p-4 border border-accent-orange/35">
                      <p className="text-xs font-bold uppercase tracking-wider text-accent-orange-dark">
                        Fats
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-gray-800 mt-1">
                        {currentDayData.daily_totals?.fats_g}g
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Target: {currentDayData.target_totals?.fats_g}g
                      </p>
                    </div>
                  </div>
                </div>

                {/* BOTTOM REGENERATE BUTTON */}
                <div className="pt-2 pb-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                    className="inline-flex items-center gap-2 rounded-btn bg-gray-800 hover:bg-gray-700 text-white font-bold px-8 py-3.5 text-sm shadow-card transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${generatingPlan ? "animate-spin" : ""}`}
                    />
                    {generatingPlan ? "Regenerating..." : "Regenerate Plan"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </UserLayout>
  );
}
