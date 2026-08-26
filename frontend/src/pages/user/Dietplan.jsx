import { useEffect, useState } from "react";
import UserLayout from "../../components/user/UserLayout";
import { httpClient } from "../../lib/http";

export default function DietPlan() {
  // =========================================================
  // USER
  // =========================================================

  const [userId, setUserId] = useState(null);

  // =========================================================
  // USER INPUTS
  // =========================================================

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");

  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("");

  // =========================================================
  // BACKEND CALCULATIONS
  // =========================================================

  const [bmiResult, setBmiResult] = useState("");
  const [bmiCategory, setBmiCategory] = useState("");
  const [bmr, setBmr] = useState("");
  const [tdee, setTdee] = useState("");
  const [goalCalories, setGoalCalories] = useState("");

  const [macros, setMacros] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  // =========================================================
  // DIET PREFERENCES
  // =========================================================

  const [dietPreference, setDietPreference] = useState("");
  const [diabetesPref, setDiabetesPref] = useState(false);
  const [nutAllergyPref, setNutAllergyPref] = useState(false);

  // =========================================================
  // UI
  // =========================================================

  const [showResult, setShowResult] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [dialogStep, setDialogStep] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const [errors, setErrors] = useState({});

  // =========================================================
  // ACTUAL DIET PLAN
  // =========================================================

  const [dietPlan, setDietPlan] = useState(null);

  // =========================================================
  // TOAST
  // =========================================================

  const showToast = (message, type = "success") => {
    window.dispatchEvent(
      new CustomEvent("app-toast", {
        detail: {
          message,
          type,
        },
      }),
    );
  };

  // =========================================================
  // STYLES
  // =========================================================

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white transition-all";

  const noSpinClass =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const buttonClass =
    "w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all duration-200 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed";

  // =========================================================
  // GET USER ID
  // =========================================================

  const getUserId = () => {
    const storedUser = localStorage.getItem("pose-fit-user");

    if (!storedUser) {
      console.error("pose-fit-user NOT FOUND IN LOCAL STORAGE");
      return null;
    }

    try {
      const user = JSON.parse(storedUser);

      const id =
        user?._id ||
        user?.id ||
        user?.userId ||
        user?.user?._id ||
        user?.user?.id ||
        user?.user?.userId;

      return id || null;
    } catch (error) {
      console.error("FAILED TO PARSE pose-fit-user:", error);
      return null;
    }
  };

  // =========================================================
  // APPLY BACKEND DATA
  // =========================================================

  const applyBackendData = (data) => {
    if (!data) return;

    setHeight(data.height ?? "");
    setWeight(data.weight ?? "");
    setAge(data.age ?? "");

    setGender(data.gender ?? "");
    setActivityLevel(data.activityLevel ?? "");
    setGoal(data.goal ?? "");

    setDietPreference(data.dietPref ?? "");
    setDiabetesPref(Boolean(data.diabetes));
    setNutAllergyPref(Boolean(data.allergiesNuts));

    if (data.bmi !== undefined && data.bmi !== null) {
      const bmi = Number(data.bmi);

      setBmiResult(Number.isFinite(bmi) ? bmi.toFixed(1) : "");

      if (bmi < 18.5) {
        setBmiCategory("Underweight");
      } else if (bmi < 25) {
        setBmiCategory("Normal");
      } else if (bmi < 30) {
        setBmiCategory("Overweight");
      } else {
        setBmiCategory("Obese");
      }
    } else {
      setBmiResult("");
      setBmiCategory("");
    }

    setBmr(data.bmr ?? "");
    setTdee(data.tdee ?? "");
    setGoalCalories(data.goalCalories ?? "");

    if (data.macros) {
      setMacros({
        protein: data.macros.protein ?? 0,
        carbs: data.macros.carbs ?? 0,
        fat: data.macros.fat ?? 0,
      });
    } else {
      setMacros({
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    }
  };

  // =========================================================
  // LOAD USER METRICS
  // =========================================================

  useEffect(() => {
    const loadUserMetrics = async () => {
      try {
        setLoading(true);

        const id = getUserId();

        if (!id) {
          showToast(
            "User ID not found. Please logout and login again.",
            "error",
          );
          return;
        }

        setUserId(id);

        const response = await httpClient.get(`/user-metrics/${id}`);

        const data = response.data?.data;

        if (!data) {
          setShowResult(false);
          return;
        }

        applyBackendData(data);
        setShowResult(true);
      } catch (error) {
        console.error("LOAD USER METRICS ERROR:", error);
        console.error("BACKEND ERROR:", error?.response?.data);

        if (error?.response?.status === 404) {
          setShowResult(false);
          return;
        }

        const errorMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to load your health information.";

        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    };

    loadUserMetrics();
  }, []);

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    const newErrors = {};

    if (!height || Number(height) <= 0) {
      newErrors.height = "Enter a valid height";
    }

    if (!weight || Number(weight) <= 0) {
      newErrors.weight = "Enter a valid weight";
    }

    if (!age || Number(age) <= 0) {
      newErrors.age = "Enter a valid age";
    }

    if (!gender) {
      newErrors.gender = "Select gender";
    }

    if (!activityLevel) {
      newErrors.activityLevel = "Select activity level";
    }

    if (!goal) {
      newErrors.goal = "Select your goal";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =========================================================
  // OPEN DIET PREFERENCES
  // =========================================================

  const handleContinue = () => {
    if (!validateForm()) {
      showToast("Please complete all required health information.", "error");
      return;
    }

    setDialogStep(1);
    setShowDialog(true);
  };

  // =========================================================
  // SAVE METRICS
  // =========================================================

  const saveMetrics = async ({ dietPref, diabetes, allergiesNuts }) => {
    const currentUserId = userId || getUserId();

    if (!currentUserId) {
      showToast("User ID not found. Please logout and login again.", "error");
      return;
    }

    if (!userId) {
      setUserId(currentUserId);
    }

    try {
      setSaving(true);

      const payload = {
        weight: Number(weight),
        height: Number(height),
        age: Number(age),
        gender,
        goal,
        activityLevel,
        dietPref,
        diabetes: Boolean(diabetes),
        allergiesNuts: Boolean(allergiesNuts),
      };

      const response = await httpClient.post(
        `/user/user-metrics/${currentUserId}`,
        payload,
      );

      const savedData = response.data?.data;

      if (!savedData) {
        throw new Error("Backend did not return saved metrics.");
      }

      applyBackendData(savedData);

      setShowDialog(false);
      setDialogStep(1);
      setShowResult(true);

      setDietPlan(null);

      showToast(
        "Your health metrics have been calculated and saved successfully.",
        "success",
      );
    } catch (error) {
      console.error("SAVE USER METRICS ERROR:", error);
      console.error("BACKEND ERROR:", error?.response?.data);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to save your health information.";

      showToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // STEP 1
  // =========================================================

  const handleDietPreference = (value) => {
    setDietPreference(value);
    setDialogStep(2);
  };

  // =========================================================
  // STEP 2
  // =========================================================

  const handleDiabetes = (value) => {
    setDiabetesPref(value);
    setDialogStep(3);
  };

  // =========================================================
  // STEP 3
  // =========================================================

  const handleNutAllergy = async (value) => {
    setNutAllergyPref(value);

    await saveMetrics({
      dietPref: dietPreference,
      diabetes: diabetesPref,
      allergiesNuts: value,
    });
  };

  // =========================================================
  // GENERATE DIET PLAN
  // =========================================================

  const generateDietPlan = async () => {
    const currentUserId = userId || getUserId();

    if (!currentUserId) {
      showToast("User ID not found. Please logout and login again.", "error");
      return;
    }

    if (!showResult) {
      showToast("Please save your health information first.", "error");
      return;
    }

    try {
      setGeneratingPlan(true);

      const response = await httpClient.post(`/diet-plan/${currentUserId}`);

      const plan = response.data?.data;

      if (!plan) {
        throw new Error("Backend did not return a diet plan.");
      }

      setDietPlan(plan);

      showToast(
        "Your personalized diet plan has been generated successfully.",
        "success",
      );
    } catch (error) {
      console.error("GENERATE DIET PLAN ERROR:", error);
      console.error("BACKEND ERROR:", error?.response?.data);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to generate your diet plan.";

      showToast(errorMessage, "error");
    } finally {
      setGeneratingPlan(false);
    }
  };

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />

            <p className="mt-4 text-sm font-bold text-gray-500">
              Loading your health information...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
        {/* HEADER */}

        <div className="max-w-6xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            Personalized Diet Planner
          </h1>

          <p className="text-gray-500 mt-2 font-medium">
            Define your goals and dietary preferences for a personalized
            nutrition plan.
          </p>
        </div>

        {/* MAIN GRID */}

        <div
          className={`max-w-6xl mx-auto grid grid-cols-1 ${
            showResult ? "lg:grid-cols-12" : "lg:grid-cols-1"
          } gap-8 items-start`}
        >
          {/* FORM */}

          <div
            className={`shadow-sm bg-white/90 border border-gray-100 ${
              showResult ? "lg:col-span-6" : "lg:col-span-1"
            }`}
          >
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900">
                Health Metrics
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Enter your information for backend calculation.
              </p>
            </div>

            <div className="p-8 space-y-8">
              {/* HEIGHT / WEIGHT / AGE */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2">
                    Height (cm)
                  </label>

                  <input
                    type="number"
                    value={height}
                    onChange={(e) => {
                      setHeight(e.target.value);

                      setErrors((prev) => ({
                        ...prev,
                        height: "",
                      }));
                    }}
                    className={`${inputClass} ${noSpinClass}`}
                    placeholder="170"
                  />

                  {errors.height && (
                    <p className="text-xs text-red-500 mt-1">{errors.height}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2">
                    Weight (kg)
                  </label>

                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => {
                      setWeight(e.target.value);

                      setErrors((prev) => ({
                        ...prev,
                        weight: "",
                      }));
                    }}
                    className={`${inputClass} ${noSpinClass}`}
                    placeholder="70"
                  />

                  {errors.weight && (
                    <p className="text-xs text-red-500 mt-1">{errors.weight}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2">
                    Age
                  </label>

                  <input
                    type="number"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);

                      setErrors((prev) => ({
                        ...prev,
                        age: "",
                      }));
                    }}
                    className={`${inputClass} ${noSpinClass}`}
                    placeholder="25"
                  />

                  {errors.age && (
                    <p className="text-xs text-red-500 mt-1">{errors.age}</p>
                  )}
                </div>
              </div>

              {/* GENDER */}

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-3">
                  Gender
                </label>

                <div className="grid grid-cols-2 gap-4">
                  {["male", "female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGender(g);

                        setErrors((prev) => ({
                          ...prev,
                          gender: "",
                        }));
                      }}
                      className={`p-5 rounded-2xl border-2 font-bold capitalize transition-all ${
                        gender === g
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                {errors.gender && (
                  <p className="text-xs text-red-500 mt-1">{errors.gender}</p>
                )}
              </div>

              {/* ACTIVITY */}

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2">
                  Activity Level
                </label>

                <select
                  value={activityLevel}
                  onChange={(e) => {
                    setActivityLevel(e.target.value);

                    setErrors((prev) => ({
                      ...prev,
                      activityLevel: "",
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="very active">Very Active</option>
                </select>

                {errors.activityLevel && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.activityLevel}
                  </p>
                )}
              </div>

              {/* GOAL */}

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2">
                  Your Goal
                </label>

                <select
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);

                    setErrors((prev) => ({
                      ...prev,
                      goal: "",
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">Select your goal</option>
                  <option value="lose weight">Weight Loss</option>
                  <option value="maintain weight">Maintain Weight</option>
                  <option value="gain weight">Weight Gain</option>
                </select>

                {errors.goal && (
                  <p className="text-xs text-red-500 mt-1">{errors.goal}</p>
                )}
              </div>

              {/* CONTINUE */}

              <button
                type="button"
                onClick={handleContinue}
                className={buttonClass}
              >
                Continue
              </button>
            </div>
          </div>

          {/* RESULTS */}

          {showResult && (
            <div className="lg:col-span-6">
              <div className="shadow-sm bg-white/90 border border-gray-100 p-8 space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Your Results
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    These values were calculated by the backend.
                  </p>
                </div>

                {/* METRICS */}

                <div className="grid grid-cols-2 gap-4">
                  <Metric label="BMI" value={bmiResult} sub={bmiCategory} />

                  <Metric label="BMR" value={bmr} sub="kcal/day" />

                  <Metric label="TDEE" value={tdee} sub="kcal/day" />

                  <Metric
                    label="Goal Calories"
                    value={goalCalories}
                    sub="kcal/day target"
                  />
                </div>

                {/* MACROS */}

                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-4">
                    Daily Macros
                  </h3>

                  <div className="space-y-3">
                    <Macro label="Protein" value={`${macros.protein}g`} />

                    <Macro label="Carbohydrates" value={`${macros.carbs}g`} />

                    <Macro label="Fats" value={`${macros.fat}g`} />
                  </div>
                </div>

                {/* GENERATE DIET PLAN */}

                {!dietPlan && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={generateDietPlan}
                      disabled={generatingPlan}
                      className={buttonClass}
                    >
                      {generatingPlan ? (
                        <span className="flex items-center justify-center gap-3">
                          <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Generating Diet Plan...
                        </span>
                      ) : (
                        "Generate Diet Plan"
                      )}
                    </button>
                  </div>
                )}

                {/* UPDATE */}

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={generatingPlan}
                  className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Update Health Information
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ACTUAL DIET PLAN */}

        {dietPlan && (
          <div className="max-w-6xl mx-auto mt-10">
            <div className="bg-white/90 border border-gray-100 shadow-sm p-8">
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                  Your Personalized Diet Plan
                </h2>

                <p className="text-sm text-gray-500 mt-2">
                  Your plan is based on your health metrics and dietary
                  preferences.
                </p>
              </div>

              <DietPlanContent dietPlan={dietPlan} />
            </div>
          </div>
        )}

        {/* PREFERENCE DIALOG */}

        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Diet Preferences
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Step {dialogStep} of 3
                  </p>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowDialog(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              {dialogStep === 1 && (
                <StepOptions
                  title="Choose your diet preference"
                  options={[
                    {
                      label: "Vegetarian",
                      value: "veg",
                    },
                    {
                      label: "Non-Vegetarian",
                      value: "non-veg",
                    },
                  ]}
                  selected={dietPreference}
                  onSelect={handleDietPreference}
                  loading={saving}
                />
              )}

              {dialogStep === 2 && (
                <StepOptions
                  title="Do you have diabetes?"
                  options={[
                    {
                      label: "Yes",
                      value: true,
                    },
                    {
                      label: "No",
                      value: false,
                    },
                  ]}
                  selected={diabetesPref}
                  onSelect={handleDiabetes}
                  loading={saving}
                />
              )}

              {dialogStep === 3 && (
                <StepOptions
                  title="Do you have any nut allergies?"
                  options={[
                    {
                      label: "Yes",
                      value: true,
                    },
                    {
                      label: "No",
                      value: false,
                    },
                  ]}
                  selected={nutAllergyPref}
                  onSelect={handleNutAllergy}
                  loading={saving}
                />
              )}

              {saving && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-9 h-9 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />

                    <p className="mt-3 text-sm font-bold text-indigo-600">
                      Saving and calculating your health metrics...
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Please wait while we process your information.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

// =============================================================
// METRIC
// =============================================================

function Metric({ label, value, sub }) {
  return (
    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
        {label}
      </p>

      <p className="text-2xl font-black text-gray-900 mt-1 capitalize">
        {value !== undefined && value !== null && value !== "" ? value : "--"}
      </p>

      <p className="text-xs text-gray-500 font-medium mt-1">{sub}</p>
    </div>
  );
}

// =============================================================
// MACRO
// =============================================================

function Macro({ label, value }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
      <span className="text-sm font-bold text-gray-600">{label}</span>

      <span className="text-sm font-black text-indigo-600">{value}</span>
    </div>
  );
}

// =============================================================
// STEP OPTIONS
// =============================================================

function StepOptions({ title, options, selected, onSelect, loading = false }) {
  return (
    <div className="space-y-5">
      <p className="font-bold text-gray-900">{title}</p>

      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => {
          const isSelected = selected === option.value;

          return (
            <button
              key={String(option.value)}
              type="button"
              disabled={loading}
              onClick={() => onSelect(option.value)}
              className={`p-5 rounded-2xl border-2 font-bold transition-all ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                  : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
// DIET PLAN CONTENT
// =============================================================

function DietPlanContent({ dietPlan }) {
  if (!dietPlan) return null;

  const meals = [
    ["Breakfast", dietPlan.breakfast],
    ["Lunch", dietPlan.lunch],
    ["Dinner", dietPlan.dinner],
    ["Snack", dietPlan.snack],
    ["Snacks", dietPlan.snacks],
  ].filter(([, meal]) => meal);

  if (meals.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {meals.map(([title, meal]) => (
          <DietMealCard key={title} title={title} meal={meal} />
        ))}
      </div>
    );
  }

  if (Array.isArray(dietPlan)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dietPlan.map((meal, index) => (
          <DietMealCard
            key={index}
            title={meal?.meal || `Meal ${index + 1}`}
            meal={meal}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
      <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
        {JSON.stringify(dietPlan, null, 2)}
      </pre>
    </div>
  );
}

// =============================================================
// DIET MEAL CARD
// =============================================================

function DietMealCard({ title, meal }) {
  if (typeof meal === "string") {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-widest font-bold text-indigo-500">
          {title}
        </p>

        <h3 className="text-xl font-black text-gray-900 mt-2">{meal}</h3>
      </div>
    );
  }

  if (!meal || typeof meal !== "object") {
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
      <p className="text-xs uppercase tracking-widest font-bold text-indigo-500">
        {title}
      </p>

      {meal.name && (
        <h3 className="text-xl font-black text-gray-900 mt-2">{meal.name}</h3>
      )}

      {meal.description && (
        <p className="text-sm text-gray-500 mt-2">{meal.description}</p>
      )}

      {meal.calories !== undefined && (
        <p className="text-sm font-bold text-gray-700 mt-4">
          Calories: {meal.calories} kcal
        </p>
      )}

      {meal.protein !== undefined && (
        <p className="text-sm text-gray-600 mt-1">Protein: {meal.protein}g</p>
      )}

      {meal.carbs !== undefined && (
        <p className="text-sm text-gray-600 mt-1">Carbs: {meal.carbs}g</p>
      )}

      {meal.fat !== undefined && (
        <p className="text-sm text-gray-600 mt-1">Fat: {meal.fat}g</p>
      )}

      {Array.isArray(meal.items) && (
        <div className="mt-4 space-y-2">
          {meal.items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-3 text-sm text-gray-700"
            >
              {typeof item === "string"
                ? item
                : item?.name || JSON.stringify(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
