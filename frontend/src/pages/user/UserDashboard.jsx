import {
  Flame,
  Droplets,
  Target,
  TrendingUp,
  Lock,
  Activity,
  Scale,
  HeartPulse,
  Moon,
} from "lucide-react";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import UserLayout from "../../components/user/UserLayout";
import { httpClient } from "../../lib/http";

// =====================================================
// DUMMY DIET DATA
// =====================================================

const dietData = [
  {
    id: 1,
    name: "Breakfast",
    image:
      "https://images.unsplash.com/photo-1494390248081-4e521a5940db?q=80&w=2606&auto=format&fit=crop",
    calories: "350 kcal",
    time: "8:00 AM",
    status: "Scheduled",
  },
  {
    id: 2,
    name: "Lunch",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2680&auto=format&fit=crop",
    calories: "600 kcal",
    time: "1:30 PM",
    status: "Scheduled",
  },
  {
    id: 3,
    name: "Snack",
    image:
      "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=2670&auto=format&fit=crop",
    calories: "200 kcal",
    time: "4:00 PM",
    status: "Scheduled",
  },
  {
    id: 4,
    name: "Dinner",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1153&auto=format&fit=crop",
    calories: "500 kcal",
    time: "8:30 PM",
    status: "Scheduled",
  },
];

// =====================================================
// USER DASHBOARD
// =====================================================

export default function UserDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // ===================================================
  // GET LOGGED-IN USER
  // ===================================================

  const getLoggedInUser = () => {
    const storedUser = localStorage.getItem("pose-fit-user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Invalid stored user:", error);

      localStorage.removeItem("pose-fit-user");

      return null;
    }
  };

  const user = getLoggedInUser();

  // ===================================================
  // USER ID
  // ===================================================

  const userId = user?._id || user?.id || user?.userId || user?.user_id;

  // ===================================================
  // FETCH USER METRICS
  // ===================================================

  useEffect(() => {
    const fetchMetrics = async () => {
      // -----------------------------------------------
      // USER NOT FOUND
      // -----------------------------------------------

      if (!userId) {
        setLoading(false);

        toast.error("User information not found. Please login again.");

        return;
      }

      try {
        setLoading(true);

        const response = await httpClient.get(`/user/user-metrics/${userId}`);

        const metricsData = response?.data?.data;

        // ---------------------------------------------
        // NO METRICS
        // ---------------------------------------------

        if (!metricsData) {
          setMetrics(null);

          toast.error("Fitness information not found.");

          return;
        }

        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        setMetrics(metricsData);
      } catch (error) {
        console.error("Fetch metrics error:", error);

        setMetrics(null);

        toast.error(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Unable to load your fitness information.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [userId]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

            <p className="text-gray-500 font-medium">
              Loading your fitness dashboard...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  // ===================================================
  // STATS
  // ===================================================

  const stats = [
    {
      label: "Daily Calorie Target",
      value: metrics?.tdee ? Math.round(metrics.tdee) : "--",
      unit: "kcal",
      icon: Flame,
      iconColor: "text-orange-500",
      bgColor: "from-orange-50 to-orange-100",
      textColor: "text-orange-700",
    },
    {
      label: "Protein Target",
      value: metrics?.macros?.protein
        ? Math.round(metrics.macros.protein)
        : "--",
      unit: "g",
      icon: Target,
      iconColor: "text-indigo-500",
      bgColor: "from-indigo-50 to-indigo-100",
      textColor: "text-indigo-700",
    },
    {
      label: "Daily Water Target",
      value: metrics?.waterIntake?.liters ? metrics.waterIntake.liters : "--",
      unit: "L",
      icon: Droplets,
      iconColor: "text-blue-500",
      bgColor: "from-blue-50 to-blue-100",
      textColor: "text-blue-700",
    },
  ];

  // ===================================================
  // MAIN UI
  // ===================================================

  return (
    <UserLayout>
      <main className="p-6 md:p-8 space-y-10">
        {/* =================================================
            HEADER
        ================================================= */}

        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900">
              Daily Progress
            </h1>

            <p className="text-gray-500 mt-1">
              Your fitness information and daily targets.
            </p>
          </div>

          <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 flex items-center gap-2 w-fit">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />

            <span className="text-sm font-medium text-gray-600">
              Metrics Available
            </span>
          </div>
        </section>

        {/* =================================================
            MAIN STATS
        ================================================= */}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className={`relative overflow-hidden bg-gradient-to-br ${stat.bgColor} p-6 md:p-8 rounded-3xl border border-white shadow-sm`}
              >
                <div className="absolute -right-5 -top-5 opacity-10">
                  <Icon className="w-32 h-32" />
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-white rounded-xl">
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>

                  <h2 className="text-gray-600 font-bold text-xs uppercase tracking-wide">
                    {stat.label}
                  </h2>
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-gray-900">
                    {stat.value}
                  </p>

                  <span
                    className={`text-sm font-bold ${stat.textColor} uppercase`}
                  >
                    {stat.unit}
                  </span>
                </div>

                {stat.label === "Daily Water Target" &&
                  metrics?.waterIntake && (
                    <p className="text-xs text-gray-500 mt-3">
                      Approx.{" "}
                      <span className="font-bold">
                        {metrics.waterIntake.glasses}
                      </span>{" "}
                      glasses per day.
                    </p>
                  )}

                {stat.label === "Daily Calorie Target" && metrics?.tdee && (
                  <p className="text-xs text-gray-500 mt-3">
                    Estimated calories required per day.
                  </p>
                )}
              </div>
            );
          })}
        </section>

        {/* =================================================
            BODY METRICS
        ================================================= */}

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900">Body Metrics</h2>

            <p className="text-gray-500 text-sm mt-1">
              Your calculated fitness measurements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BMI */}

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <Scale className="w-5 h-5 text-emerald-600" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">BMI</h3>

                  <p className="text-xs text-gray-400">Body Mass Index</p>
                </div>
              </div>

              <p className="text-4xl font-black text-gray-900">
                {metrics?.bmi ?? "--"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Based on your current height and weight.
              </p>
            </div>

            {/* BMR */}

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <Flame className="w-5 h-5 text-orange-600" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">BMR</h3>

                  <p className="text-xs text-gray-400">Basal Metabolic Rate</p>
                </div>
              </div>

              <p className="text-4xl font-black text-gray-900">
                {metrics?.bmr ? Math.round(metrics.bmr) : "--"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Calories your body needs at rest.
              </p>
            </div>

            {/* TDEE */}

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">TDEE</h3>

                  <p className="text-xs text-gray-400">
                    Daily Energy Requirement
                  </p>
                </div>
              </div>

              <p className="text-4xl font-black text-gray-900">
                {metrics?.tdee ? Math.round(metrics.tdee) : "--"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Estimated daily calorie requirement.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            FITNESS PROFILE
        ================================================= */}

        <section className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <HeartPulse className="w-5 h-5 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Your Fitness Profile
              </h2>

              <p className="text-sm text-gray-400">
                Information used for your fitness calculations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Weight */}

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Weight</p>

              <p className="font-bold text-gray-900">
                {metrics?.weight ?? "--"} kg
              </p>
            </div>

            {/* Height */}

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Height</p>

              <p className="font-bold text-gray-900">
                {metrics?.height ?? "--"} cm
              </p>
            </div>

            {/* Age */}

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Age</p>

              <p className="font-bold text-gray-900">
                {metrics?.age ?? "--"} years
              </p>
            </div>

            {/* Goal */}

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Goal</p>

              <p className="font-bold text-gray-900 capitalize">
                {metrics?.goal ?? "--"}
              </p>
            </div>

            {/* Gender */}

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Gender</p>

              <p className="font-bold text-gray-900 capitalize">
                {metrics?.gender ?? "--"}
              </p>
            </div>

            {/* Activity Level */}

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Activity Level</p>

              <p className="font-bold text-gray-900 capitalize">
                {metrics?.activityLevel ?? "--"}
              </p>
            </div>

            {/* Diet Preference */}

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Diet Preference</p>

              <p className="font-bold text-gray-900 capitalize">
                {metrics?.dietPref ?? "--"}
              </p>
            </div>

            {/* Diabetes */}

            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1">Diabetes</p>

              <p className="font-bold text-gray-900 capitalize">
                {metrics?.diabetes ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {/* Allergy */}

          <div className="mt-4 bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Nut Allergy</p>

            <p className="font-bold text-gray-900">
              {metrics?.allergiesNuts ? "Yes" : "No"}
            </p>
          </div>
        </section>

        {/* =================================================
            MACROS
        ================================================= */}

        <section className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900">
              Daily Macro Targets
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Your estimated daily macronutrient requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Protein */}

            <div className="bg-indigo-50 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase text-indigo-500">
                Protein
              </p>

              <p className="text-3xl font-black text-gray-900 mt-2">
                {metrics?.macros?.protein
                  ? Math.round(metrics.macros.protein)
                  : "--"}{" "}
                g
              </p>
            </div>

            {/* Carbs */}

            <div className="bg-emerald-50 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase text-emerald-500">
                Carbs
              </p>

              <p className="text-3xl font-black text-gray-900 mt-2">
                {metrics?.macros?.carbs
                  ? Math.round(metrics.macros.carbs)
                  : "--"}{" "}
                g
              </p>
            </div>

            {/* Fat */}

            <div className="bg-orange-50 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase text-orange-500">Fat</p>

              <p className="text-3xl font-black text-gray-900 mt-2">
                {metrics?.macros?.fat ? Math.round(metrics.macros.fat) : "--"} g
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            DAILY HYDRATION
        ================================================= */}

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900">
              Daily Hydration
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Your recommended daily water intake.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Liters */}

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Droplets className="w-5 h-5 text-blue-500" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">Water Target</h3>

                  <p className="text-xs text-gray-400">Per day</p>
                </div>
              </div>

              <p className="text-4xl font-black text-gray-900">
                {metrics?.waterIntake?.liters ?? "--"}
              </p>

              <p className="text-sm text-blue-500 font-bold mt-1">Liters</p>
            </div>

            {/* Glasses */}

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-cyan-50 rounded-xl">
                  <Droplets className="w-5 h-5 text-cyan-500" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">Water Glasses</h3>

                  <p className="text-xs text-gray-400">Per day</p>
                </div>
              </div>

              <p className="text-4xl font-black text-gray-900">
                {metrics?.waterIntake?.glasses ?? "--"}
              </p>

              <p className="text-sm text-cyan-500 font-bold mt-1">Glasses</p>
            </div>

            {/* ML */}

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-sky-50 rounded-xl">
                  <Droplets className="w-5 h-5 text-sky-500" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">Water Amount</h3>

                  <p className="text-xs text-gray-400">Per day</p>
                </div>
              </div>

              <p className="text-4xl font-black text-gray-900">
                {metrics?.waterIntake?.ml ?? "--"}
              </p>

              <p className="text-sm text-sky-500 font-bold mt-1">ml</p>
            </div>
          </div>
        </section>

        {/* =================================================
            WEEKLY ACTIVITY + STREAK
        ================================================= */}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity */}

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Weekly Activity
                </h2>

                <p className="text-xs text-gray-400">
                  Workout activity tracking
                </p>
              </div>
            </div>

            <div className="py-8 text-center">
              <p className="text-gray-400 text-sm">
                Weekly workout activity is not available yet.
              </p>

              <p className="text-xs text-gray-400 mt-2">
                It will be connected with your workout/posture tracking system.
              </p>
            </div>
          </div>

          {/* Streak */}

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-orange-50 rounded-xl">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Workout Streak
                </h2>

                <p className="text-xs text-gray-400">Your consistency</p>
              </div>
            </div>

            <div className="py-8 text-center">
              <p className="text-4xl font-black text-gray-900">--</p>

              <p className="text-sm text-gray-400 mt-2">
                Streak tracking will be available once workout activity is
                recorded.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            HEALTH TRACKING
        ================================================= */}

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900">
              Health Tracking
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              These features will be connected with future tracking systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WATER */}

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Droplets className="w-5 h-5 text-blue-500" />
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900">Water Intake</h3>

                    <p className="text-xs text-gray-400">Recommended today</p>
                  </div>
                </div>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-500">
                  Recommended
                </span>
              </div>

              <div className="mt-6">
                <p className="text-3xl font-black text-gray-900">
                  {metrics?.waterIntake?.liters ?? "--"} L
                </p>

                <p className="text-sm text-gray-400 mt-2">
                  Approximately{" "}
                  <span className="font-bold text-gray-700">
                    {metrics?.waterIntake?.glasses ?? "--"}
                  </span>{" "}
                  glasses per day.
                </p>
              </div>
            </div>

            {/* SLEEP */}

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Moon className="w-5 h-5 text-purple-500" />
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900">Sleep Quality</h3>

                    <p className="text-xs text-gray-400">Today's sleep</p>
                  </div>
                </div>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
                  Not Tracked
                </span>
              </div>

              <div className="mt-6">
                <p className="text-3xl font-black text-gray-900">--</p>

                <p className="text-sm text-gray-400 mt-2">
                  Sleep data will be added with sleep tracking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            TODAY'S NUTRITION
        ================================================= */}

        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 uppercase">
              Today's Nutrition
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Your personalized meals will appear here.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dietData.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* IMAGE */}

                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                    <Lock className="h-10 w-10 text-white mb-2" />

                    <p className="text-white text-xs font-semibold">
                      Diet plan coming soon
                    </p>
                  </div>

                  {/* TIME */}

                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-gray-900">
                      {item.time}
                    </span>
                  </div>

                  {/* NAME */}

                  <div className="absolute bottom-4 left-4">
                    <h3 className="font-bold text-white text-xl">
                      {item.name}
                    </h3>
                  </div>
                </div>

                {/* DETAILS */}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400">
                        Calories
                      </span>

                      <span className="font-bold text-gray-900">
                        {item.calories}
                      </span>
                    </div>

                    <div className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-50 text-gray-400">
                      {item.status}
                    </div>
                  </div>

                  <button
                    disabled
                    className="w-full py-3 rounded-2xl text-xs font-bold bg-gray-50 text-gray-400 cursor-not-allowed"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            Your personalized diet plan will appear here once it has been
            generated.
          </div>
        </section>
      </main>
    </UserLayout>
  );
}
