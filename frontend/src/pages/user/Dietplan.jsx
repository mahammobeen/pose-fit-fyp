import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Calendar,
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

  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("");

  const [metrics, setMetrics] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);

  const [selectedDay, setSelectedDay] = useState(1);

  const [loading, setLoading] = useState(true);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [errors, setErrors] = useState({});

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

  const clearMetricForm = () => {
    setAge("");
    setHeight("");
    setWeight("");
    setGender("");
    setActivityLevel("");
    setGoal("");
    setErrors({});
  };

  const discardDietPlan = () => {
    setDietPlan(null);
    setSelectedDay(1);

    window.dispatchEvent(new CustomEvent("diet-plan-updated"));
  };

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

        try {
          const metricsRes = await httpClient.get(`/user/user-metrics/${id}`);

          if (metricsRes.data?.data) {
            const savedMetrics = metricsRes.data.data;

            setMetrics(savedMetrics);
            clearMetricForm();
          }
        } catch (err) {
          if (err?.response?.status !== 404) {
            console.error("Error loading metrics:", err);
          }
        }

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

  const validate = () => {
    const newErrors = {};

    if (!age || age.trim() === "") {
      newErrors.age = "Age is required";
    } else {
      const numAge = Number(age);

      if (!Number.isInteger(numAge) || numAge < 16 || numAge > 50) {
        newErrors.age = "Age must be between 16 and 50 years inclusive";
      }
    }

    if (!height || height.trim() === "") {
      newErrors.height = "Height is required";
    } else {
      const numHeight = Number(height);

      if (isNaN(numHeight) || numHeight < 100 || numHeight > 250) {
        newErrors.height = "Height must be between 100 and 250 cm inclusive";
      }
    }

    if (!weight || weight.trim() === "") {
      newErrors.weight = "Weight is required";
    } else {
      const numWeight = Number(weight);

      if (isNaN(numWeight) || numWeight < 25 || numWeight > 200) {
        newErrors.weight = "Weight must be between 25 and 200 kg inclusive";
      }
    }

    if (!gender) {
      newErrors.gender = "Please select your gender";
    }

    if (!activityLevel) {
      newErrors.activityLevel = "Please select your activity level";
    }

    if (!goal) {
      newErrors.goal = "Please select your fitness goal";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSaveMetrics = async (e) => {
    if (e) {
      e.preventDefault();
    }

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
        payload,
      );

      const saved = res.data?.data;

      if (!saved) {
        throw new Error("Server did not return saved metrics");
      }

      discardDietPlan();

      setMetrics(saved);

      clearMetricForm();

      toast.success(
        "Health metrics calculated successfully! Your previous diet plan has been discarded.",
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

  const handleGeneratePlan = async () => {
    const currentId = userId || getUserId();

    if (!currentId) {
      toast.error("User session missing. Please log in again.");
      return;
    }

    if (!metrics) {
      toast.error(
        "Please calculate and save your Health Metrics first before generating a plan.",
      );
      return;
    }

    try {
      setGeneratingPlan(true);

      const hadExistingPlan = Boolean(dietPlan);

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

      window.dispatchEvent(new CustomEvent("diet-plan-updated"));

      toast.success(
        hadExistingPlan
          ? "Your 3-day diet plan has been regenerated!"
          : "Your 3-day personalized diet plan has been generated!",
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

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-[70vh] w-full flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />

            <p className="text-xs sm:text-sm font-bold text-gray-500">
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

  const hasFormValues = Boolean(
    age || height || weight || gender || activityLevel || goal,
  );

  return (
    <UserLayout>
      <main className="w-full min-w-0 overflow-x-hidden bg-transparent px-3 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 lg:py-8 space-y-6 sm:space-y-8 font-sans">

        <div className="w-full max-w-6xl mx-auto min-w-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl leading-tight sm:text-2xl md:text-3xl font-extrabold tracking-tight text-gray-800">
              Personalized{" "}
              <span className="inline-block mt-1 sm:mt-0 rounded-btn bg-brand-light/40 px-2.5 py-1 sm:px-3 sm:py-1 text-brand-dark">
                Diet Planner
              </span>
            </h1>

            <p className="max-w-3xl text-[11px] sm:text-xs md:text-sm font-medium leading-5 sm:leading-6 text-gray-500">
              Calculate your precise nutritional targets and generate an
              authentic 3-day Pakistani meal plan optimized by our ML model.
            </p>
          </div>
        </div>

        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-start min-w-0">

          <section className="lg:col-span-6 min-w-0 card bg-surface/90 border border-brand-light/40 p-4 sm:p-5 md:p-6 lg:p-8">
            <div className="flex items-start gap-2.5 sm:gap-3 mb-5 sm:mb-6">
              <div className="shrink-0 p-2.5 sm:p-3 bg-brand-light/35 rounded-btn">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-brand-dark" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-800">
                  Health Information
                </h2>

                <p className="text-[11px] sm:text-xs leading-5 text-gray-400 mt-1">
                  Enter your physical parameters to compute BMI, BMR, TDEE, &
                  Macros.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSaveMetrics}
              className="space-y-4 sm:space-y-5"
            >

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">

                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Age (yrs)
                  </label>

                  <input
                    type="number"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);

                      if (errors.age) {
                        setErrors((prev) => ({
                          ...prev,
                          age: "",
                        }));
                      }
                    }}
                    placeholder="16 - 50"
                    className="w-full min-w-0 rounded-btn border border-gray-200 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3 text-xs sm:text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  {errors.age && (
                    <p className="text-[10px] sm:text-xs text-red-500 mt-1.5 font-semibold leading-4">
                      {errors.age}
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Height (cm)
                  </label>

                  <input
                    type="number"
                    value={height}
                    onChange={(e) => {
                      setHeight(e.target.value);

                      if (errors.height) {
                        setErrors((prev) => ({
                          ...prev,
                          height: "",
                        }));
                      }
                    }}
                    placeholder="100 - 250"
                    className="w-full min-w-0 rounded-btn border border-gray-200 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3 text-xs sm:text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  {errors.height && (
                    <p className="text-[10px] sm:text-xs text-red-500 mt-1.5 font-semibold leading-4">
                      {errors.height}
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Weight (kg)
                  </label>

                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => {
                      setWeight(e.target.value);

                      if (errors.weight) {
                        setErrors((prev) => ({
                          ...prev,
                          weight: "",
                        }));
                      }
                    }}
                    placeholder="25 - 200"
                    className="w-full min-w-0 rounded-btn border border-gray-200 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3 text-xs sm:text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  {errors.weight && (
                    <p className="text-[10px] sm:text-xs text-red-500 mt-1.5 font-semibold leading-4">
                      {errors.weight}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Gender
                </label>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {["male", "female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGender(g);

                        if (errors.gender) {
                          setErrors((prev) => ({
                            ...prev,
                            gender: "",
                          }));
                        }
                      }}
                      className={`min-w-0 py-2.5 sm:py-3 px-3 sm:px-4 rounded-btn border font-bold capitalize text-xs sm:text-sm transition-all ${
                        gender === g
                          ? "border-brand bg-brand-light/40 text-brand-dark shadow-xs"
                          : "border-gray-200 bg-white/70 text-gray-600 hover:bg-brand-light/15"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                {errors.gender && (
                  <p className="text-[10px] sm:text-xs text-red-500 mt-1.5 font-semibold">
                    {errors.gender}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Activity Level
                </label>

                <select
                  value={activityLevel}
                  onChange={(e) => {
                    setActivityLevel(e.target.value);

                    if (errors.activityLevel) {
                      setErrors((prev) => ({
                        ...prev,
                        activityLevel: "",
                      }));
                    }
                  }}
                  className="w-full min-w-0 rounded-btn border border-gray-200 bg-white/80 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                >
                  <option value="">Select activity level</option>

                  <option value="sedentary">
                    Sedentary (little to no exercise)
                  </option>

                  <option value="light">
                    Light (light exercise 1-3 days/wk)
                  </option>

                  <option value="moderate">
                    Moderate (moderate exercise 3-5 days/wk)
                  </option>

                  <option value="active">
                    Active (hard exercise 6-7 days/wk)
                  </option>

                  <option value="very active">
                    Very Active (intense daily exercise)
                  </option>
                </select>

                {errors.activityLevel && (
                  <p className="text-[10px] sm:text-xs text-red-500 mt-1.5 font-semibold">
                    {errors.activityLevel}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Fitness Goal
                </label>

                <select
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);

                    if (errors.goal) {
                      setErrors((prev) => ({
                        ...prev,
                        goal: "",
                      }));
                    }
                  }}
                  className="w-full min-w-0 rounded-btn border border-gray-200 bg-white/80 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                >
                  <option value="">Select your goal</option>

                  <option value="lose weight">
                    Weight Loss (500 kcal deficit)
                  </option>

                  <option value="maintain weight">
                    Maintain Weight (equipoise)
                  </option>

                  <option value="gain weight">
                    Weight Gain (500 kcal surplus)
                  </option>
                </select>

                {errors.goal && (
                  <p className="text-[10px] sm:text-xs text-red-500 mt-1.5 font-semibold">
                    {errors.goal}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={savingMetrics}
                className="w-full min-h-[46px] sm:min-h-[50px] py-3 rounded-btn bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs sm:text-sm shadow-card transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingMetrics ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Calculating & Saving...</span>
                  </span>
                ) : hasFormValues ? (
                  "Recalculate Health Metrics"
                ) : (
                  "Calculate Health Metrics"
                )}
              </button>
            </form>
          </section>

          <section className="lg:col-span-6 min-w-0 card bg-surface/90 border border-brand-light/40 p-4 sm:p-5 md:p-6 lg:p-8 space-y-5 sm:space-y-6">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="shrink-0 p-2.5 sm:p-3 bg-accent-blue/30 rounded-btn">
                <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-800">
                  Calculated Targets
                </h2>

                <p className="text-[11px] sm:text-xs leading-5 text-gray-400 mt-1">
                  {metrics
                    ? "Updated from your latest health metrics."
                    : "Enter and save your metrics on the left to see your targets."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">

              <div className="min-w-0 bg-brand-light/15 rounded-btn p-3 sm:p-4 border border-brand-light/30">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                  BMI
                </p>

                <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 mt-1 break-words">
                  {metrics?.bmiValue || metrics?.bmi
                    ? Number(metrics?.bmiValue || metrics?.bmi).toFixed(1)
                    : "--"}
                </p>

                <span className="inline-block mt-1 text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-light/40 text-brand-dark max-w-full truncate">
                  {metrics?.bmiCategory || "--"}
                </span>
              </div>

              <div className="min-w-0 bg-accent-blue/15 rounded-btn p-3 sm:p-4 border border-accent-blue/30">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                  BMR
                </p>

                <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 mt-1 break-words">
                  {metrics?.bmr ? Math.round(metrics.bmr) : "--"}
                </p>

                <p className="text-[9px] sm:text-[11px] text-gray-500 font-medium mt-1">
                  kcal / day (Basal)
                </p>
              </div>

              <div className="min-w-0 bg-accent-orange/15 rounded-btn p-3 sm:p-4 border border-accent-orange/30">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                  TDEE
                </p>

                <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 mt-1 break-words">
                  {metrics?.tdee ? Math.round(metrics.tdee) : "--"}
                </p>

                <p className="text-[9px] sm:text-[11px] text-gray-500 font-medium mt-1">
                  kcal / day (Maintenance)
                </p>
              </div>

              <div className="min-w-0 bg-brand-light/25 rounded-btn p-3 sm:p-4 border border-brand-light/40">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-dark">
                  Target Calories
                </p>

                <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 mt-1 break-words">
                  {metrics?.targetCalories || metrics?.goalCalories
                    ? Math.round(metrics.targetCalories || metrics.goalCalories)
                    : "--"}
                </p>

                <p className="text-[9px] sm:text-[11px] text-brand-dark font-medium mt-1 capitalize truncate">
                  {metrics?.goal || "Goal Target"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-gray-800 mb-3 uppercase tracking-wider">
                Daily Macronutrient Targets
              </h3>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">

                <div className="min-w-0 p-2.5 sm:p-3.5 rounded-btn bg-brand-light/20 border border-brand-light/35">
                  <span className="block text-[8px] sm:text-[10px] md:text-[11px] font-bold text-gray-500 uppercase">
                    Protein
                  </span>

                  <span className="text-base sm:text-lg md:text-xl font-extrabold text-brand-dark break-words">
                    {metrics?.protein || metrics?.macros?.protein
                      ? `${Math.round(
                          metrics.protein || metrics.macros.protein,
                        )}g`
                      : "--"}
                  </span>
                </div>

                <div className="min-w-0 p-2.5 sm:p-3.5 rounded-btn bg-accent-blue/20 border border-accent-blue/35">
                  <span className="block text-[8px] sm:text-[10px] md:text-[11px] font-bold text-gray-500 uppercase">
                    Carbs
                  </span>

                  <span className="text-base sm:text-lg md:text-xl font-extrabold text-blue-700 break-words">
                    {metrics?.carbs || metrics?.macros?.carbs
                      ? `${Math.round(metrics.carbs || metrics.macros.carbs)}g`
                      : "--"}
                  </span>
                </div>

                <div className="min-w-0 p-2.5 sm:p-3.5 rounded-btn bg-accent-orange/20 border border-accent-orange/35">
                  <span className="block text-[8px] sm:text-[10px] md:text-[11px] font-bold text-gray-500 uppercase">
                    Fats
                  </span>

                  <span className="text-base sm:text-lg md:text-xl font-extrabold text-accent-orange-dark break-words">
                    {metrics?.fats || metrics?.macros?.fat
                      ? `${Math.round(metrics.fats || metrics.macros.fat)}g`
                      : "--"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-brand-light/30">
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={generatingPlan || !metrics}
                className="w-full min-h-[48px] sm:min-h-[54px] py-3 sm:py-4 rounded-btn bg-gray-800 hover:bg-gray-700 text-white font-extrabold text-xs sm:text-sm shadow-card transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 px-3"
              >
                {generatingPlan ? (
                  <>
                    <span className="shrink-0 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="truncate">
                      Generating 3-Day Plan with AI Model...
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Generate 3-Day Diet Plan</span>
                  </>
                )}
              </button>

              {!metrics && (
                <p className="text-[10px] sm:text-[11px] text-center text-gray-400 mt-2 leading-4">
                  Please calculate and save your health metrics above first.
                </p>
              )}
            </div>
          </section>
        </div>

        {dietPlan && (
          <section className="w-full max-w-6xl mx-auto min-w-0 space-y-5 sm:space-y-6">

            {dietPlan.isExpired && (
              <div className="rounded-card bg-amber-50 border border-amber-200 p-3.5 sm:p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div className="shrink-0 p-2 sm:p-2.5 bg-amber-100 rounded-btn text-amber-700">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-extrabold text-amber-900">
                      Your 3-Day Diet Plan Has Expired
                    </h3>

                    <p className="text-[10px] sm:text-xs text-amber-700 mt-0.5 leading-5">
                      Completed Day 3. Regenerate your plan to receive fresh
                      meals for the next 3 days!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan}
                  className="w-full sm:w-auto shrink-0 rounded-btn bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2.5 transition-all shadow-xs disabled:opacity-50"
                >
                  Regenerate New Plan
                </button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-brand-light/30 pb-4 sm:pb-5">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-800">
                  Your 3-Day Meal Plan
                </h2>

                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 leading-5">
                  Goal:{" "}
                  <span className="font-bold capitalize text-brand-dark">
                    {dietPlan.fitnessGoal}
                  </span>
                  <span className="mx-1">•</span>
                  Daily Target:{" "}
                  <span className="font-bold text-gray-800">
                    {Math.round(dietPlan.targetDailyCalories)} kcal
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 bg-surface/90 p-1.5 rounded-btn border border-brand-light/40 shadow-xs w-full lg:w-auto overflow-x-auto">
                {[1, 2, 3].map((dayNum) => {
                  const isToday = dietPlan.currentDay === dayNum;

                  const isSelected = selectedDay === dayNum;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedDay(dayNum)}
                      className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 md:px-4 py-2 rounded-btn text-[10px] sm:text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-brand text-white shadow-xs"
                          : "text-gray-600 hover:bg-brand-light/20"
                      }`}
                    >
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      Day {dayNum}
                      {isToday && (
                        <span className="ml-0.5 sm:ml-1 text-[7px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-full bg-white text-brand-dark uppercase tracking-wider font-black">
                          Today
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {currentDayData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                  {["breakfast", "lunch", "dinner", "snack"].map((slotKey) => {
                    const slot = currentDayData.meals?.[slotKey];

                    if (!slot) return null;

                    const title = slot.slot_name || slotKey.toUpperCase();

                    const categoryImage =
                      MEAL_CATEGORY_IMAGES[title] || MEAL_CATEGORY_IMAGES.Lunch;

                    return (
                      <div
                        key={slotKey}
                        className="group min-w-0 flex flex-col overflow-hidden rounded-card border border-brand-light/50 bg-surface/90 shadow-card transition-all duration-300 md:hover:-translate-y-1 md:hover:shadow-card-hover"
                      >

                        <div className="relative h-40 sm:h-44 md:h-48 w-full overflow-hidden bg-brand-light/20">
                          <img
                            src={categoryImage}
                            alt={title}
                            className="h-full w-full object-cover transition-transform duration-500 md:group-hover:scale-105"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                          <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                            <span className="rounded-btn border border-white/40 bg-surface/90 px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider text-gray-800 shadow-card backdrop-blur-md">
                              {title}
                            </span>
                          </div>

                          <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 flex items-end justify-between gap-2 sm:gap-3 text-white">
                            <h3 className="font-extrabold text-base sm:text-lg md:text-xl min-w-0 truncate">
                              {title}
                            </h3>

                            <span className="shrink-0 rounded-btn bg-brand px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-black">
                              {slot.total_calories} kcal
                            </span>
                          </div>
                        </div>

                        <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 flex-1">

                          <div className="space-y-2.5">
                            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                              Recommended Dish(es) & Portion Size
                            </p>

                            {slot.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="min-w-0 p-2.5 sm:p-3 rounded-btn bg-white/90 border border-brand-light/30 flex items-center justify-between gap-2 sm:gap-3 shadow-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs sm:text-sm text-gray-800 break-words">
                                    {item.dish_name}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[10px] sm:text-xs text-gray-500">
                                    <span className="font-extrabold text-brand-dark bg-brand-light/30 px-1.5 sm:px-2 py-0.5 rounded-btn text-[9px] sm:text-[11px]">
                                      Portion: {item.portion_grams}g
                                    </span>

                                    <span>•</span>

                                    <span>{item.calories} kcal</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-3 sm:pt-4 border-t border-brand-light/30">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

                              <div className="p-2 sm:p-2.5 rounded-btn bg-brand-light/15 text-center min-w-0">
                                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400">
                                  Calories
                                </span>

                                <span className="text-[10px] sm:text-xs font-extrabold text-gray-800 break-words">
                                  {slot.total_calories}
                                </span>
                              </div>

                              <div className="p-2 sm:p-2.5 rounded-btn bg-brand-light/15 text-center min-w-0">
                                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400">
                                  Protein
                                </span>

                                <span className="text-[10px] sm:text-xs font-extrabold text-brand-dark break-words">
                                  {slot.total_protein}g
                                </span>
                              </div>

                              <div className="p-2 sm:p-2.5 rounded-btn bg-accent-blue/15 text-center min-w-0">
                                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400">
                                  Carbs
                                </span>

                                <span className="text-[10px] sm:text-xs font-extrabold text-blue-700 break-words">
                                  {slot.total_carbs}g
                                </span>
                              </div>

                              <div className="p-2 sm:p-2.5 rounded-btn bg-accent-orange/15 text-center min-w-0">
                                <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-gray-400">
                                  Fats
                                </span>

                                <span className="text-[10px] sm:text-xs font-extrabold text-accent-orange-dark break-words">
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

                <div className="card bg-surface/90 border border-brand-light/40 p-4 sm:p-5 md:p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-extrabold text-gray-800">
                        Day {selectedDay} Nutrition Summary
                      </h3>

                      <p className="text-[10px] sm:text-xs text-gray-400 mt-1 leading-5">
                        Actual daily recommended totals vs your target
                        requirements.
                      </p>
                    </div>

                    <span className="self-start sm:self-auto shrink-0 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full bg-brand-light/40 text-brand-dark border border-brand-light/60">
                      Day {selectedDay} Compliance
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">

                    <div className="min-w-0 bg-brand-light/20 rounded-btn p-3 sm:p-4 border border-brand-light/35">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
                        Calories
                      </p>

                      <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-800 mt-1 break-words">
                        {currentDayData.daily_totals?.calories}
                      </p>

                      <p className="text-[9px] sm:text-[11px] text-gray-400 mt-0.5 leading-4">
                        Target: {currentDayData.target_totals?.calories} kcal
                      </p>
                    </div>

                    <div className="min-w-0 bg-brand-light/20 rounded-btn p-3 sm:p-4 border border-brand-light/35">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-dark">
                        Protein
                      </p>

                      <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-800 mt-1 break-words">
                        {currentDayData.daily_totals?.protein_g}g
                      </p>

                      <p className="text-[9px] sm:text-[11px] text-gray-400 mt-0.5 leading-4">
                        Target: {currentDayData.target_totals?.protein_g}g
                      </p>
                    </div>

                    <div className="min-w-0 bg-accent-blue/20 rounded-btn p-3 sm:p-4 border border-accent-blue/35">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700">
                        Carbohydrates
                      </p>

                      <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-800 mt-1 break-words">
                        {currentDayData.daily_totals?.carbs_g}g
                      </p>

                      <p className="text-[9px] sm:text-[11px] text-gray-400 mt-0.5 leading-4">
                        Target: {currentDayData.target_totals?.carbs_g}g
                      </p>
                    </div>

                    <div className="min-w-0 bg-accent-orange/20 rounded-btn p-3 sm:p-4 border border-accent-orange/35">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-accent-orange-dark">
                        Fats
                      </p>

                      <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-800 mt-1 break-words">
                        {currentDayData.daily_totals?.fats_g}g
                      </p>

                      <p className="text-[9px] sm:text-[11px] text-gray-400 mt-0.5 leading-4">
                        Target: {currentDayData.target_totals?.fats_g}g
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-1 pb-4 sm:pb-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                    className="w-full sm:w-auto min-h-[46px] sm:min-h-[50px] inline-flex items-center justify-center gap-2 rounded-btn bg-gray-800 hover:bg-gray-700 text-white font-bold px-5 sm:px-7 md:px-8 py-3 text-xs sm:text-sm shadow-card transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`w-4 h-4 shrink-0 ${
                        generatingPlan ? "animate-spin" : ""
                      }`}
                    />

                    <span>
                      {generatingPlan ? "Regenerating..." : "Regenerate Plan"}
                    </span>
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
