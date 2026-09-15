import {
  Flame,
  Droplets,
  Target,
  Lock,
  Activity,
  Scale,
  HeartPulse,
  X,
  AlertCircle,
} from "lucide-react";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import UserLayout from "../../components/user/UserLayout";
import { httpClient } from "../../lib/http";

import breakfastImg from "../../assets/breakfast.jpg";
import lunchImg from "../../assets/lunch.jpg";
import dinnerImg from "../../assets/dinner.jpg";
import snackImg from "../../assets/snack.jpg";

const dietData = [
  {
    id: 1,
    name: "Breakfast",
    image: breakfastImg,
    calories: "350 kcal",
    time: "8:00 AM",
    status: "Scheduled",
  },
  {
    id: 2,
    name: "Lunch",
    image: lunchImg,
    calories: "600 kcal",
    time: "1:30 PM",
    status: "Scheduled",
  },
  {
    id: 3,
    name: "Snack",
    image: snackImg,
    calories: "200 kcal",
    time: "4:00 PM",
    status: "Scheduled",
  },
  {
    id: 4,
    name: "Dinner",
    image: dinnerImg,
    calories: "500 kcal",
    time: "8:30 PM",
    status: "Scheduled",
  },
];

export default function UserDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeRatingSession, setActiveRatingSession] = useState(null);

  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  const getDismissedProIds = () => {
    try {
      const stored = localStorage.getItem("posefit_dismissed_pro_ratings");

      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const markProDismissed = (proId) => {
    try {
      if (!proId) return;

      const dismissed = getDismissedProIds();

      if (!dismissed.includes(proId.toString())) {
        dismissed.push(proId.toString());

        localStorage.setItem(
          "posefit_dismissed_pro_ratings",
          JSON.stringify(dismissed),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPendingRatings = async () => {
    try {
      const res = await httpClient.get("/reviews/pending-ratings");

      const sessions = res.data?.pendingSessions || [];

      const dismissedProIds = getDismissedProIds();

      const eligibleToPrompt = sessions.filter((s) => {
        const proId = s.professional?._id || s.professional;

        return proId && !dismissedProIds.includes(proId.toString());
      });

      if (eligibleToPrompt.length > 0) {
        setActiveRatingSession(eligibleToPrompt[0]);
        setSelectedRating(5);
        setHoverRating(0);
      } else {
        setActiveRatingSession(null);
      }
    } catch (err) {
      console.error("Fetch pending ratings error:", err);
    }
  };

  const handleDismissDialog = () => {
    if (activeRatingSession) {
      const proId =
        activeRatingSession.professional?._id ||
        activeRatingSession.professional;

      markProDismissed(proId);
    }

    setActiveRatingSession(null);
  };

  const handleSubmitRating = async (e) => {
    if (e) e.preventDefault();

    if (!activeRatingSession) return;

    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      toast.error("Please select a rating between 1 and 5 stars.");

      return;
    }

    try {
      setSubmittingRating(true);

      const res = await httpClient.post("/reviews/professional", {
        reviewType: "PROFESSIONAL",
        paymentId: activeRatingSession._id,
        rating: selectedRating,
      });

      toast.success(res.data?.message || "Rating submitted successfully!");

      const proId =
        activeRatingSession.professional?._id ||
        activeRatingSession.professional;

      markProDismissed(proId);

      setActiveRatingSession(null);
    } catch (err) {
      console.error("Submit session rating error:", err);

      toast.error(err?.response?.data?.message || "Failed to submit rating.");
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    fetchPendingRatings();
  }, []);

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

  const userId = user?._id || user?.id || user?.userId || user?.user_id;

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!userId) {
        setLoading(false);

        toast.error("User information not found. Please login again.");

        return;
      }

      try {
        setLoading(true);

        const response = await httpClient.get(`/user/user-metrics/${userId}`);

        const metricsData = response?.data?.data;

        if (!metricsData) {
          setMetrics(null);

          toast.error("Fitness information not found.");

          return;
        }

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

  const [todayDiet, setTodayDiet] = useState(null);

  useEffect(() => {
    const fetchTodayDiet = async () => {
      if (!userId) return;

      try {
        const res = await httpClient.get(`/user/diet-plan/${userId}/today`);

        if (res.data?.success) {
          setTodayDiet(res.data);
        }
      } catch (err) {
        if (err?.response?.status !== 404) {
          console.error("Fetch today diet error:", err);
        }

        setTodayDiet(null);
      }
    };

    fetchTodayDiet();

    const handleDietUpdated = () => {
      fetchTodayDiet();
    };

    window.addEventListener("diet-plan-updated", handleDietUpdated);

    return () => {
      window.removeEventListener("diet-plan-updated", handleDietUpdated);
    };
  }, [userId]);

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-full flex items-center justify-center bg-stone-50">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />

            <p className="text-gray-500 font-medium">
              Loading your fitness dashboard...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  const stats = [
    {
      label: "Daily Calorie Target",
      value: metrics?.tdee ? Math.round(metrics.tdee) : "--",
      unit: "kcal",
      icon: Flame,
      iconColor: "text-accent-orange-dark",
      bgColor: "from-accent-orange/70 to-accent-orange/30",
      textColor: "text-accent-orange-dark",
    },
    {
      label: "Protein Target",
      value: metrics?.macros?.protein
        ? Math.round(metrics.macros.protein)
        : "--",
      unit: "g",
      icon: Target,
      iconColor: "text-brand-dark",
      bgColor: "from-brand-light/70 to-brand-light/30",
      textColor: "text-brand-dark",
    },
    {
      label: "Daily Water Target",
      value: metrics?.waterIntake?.liters ? metrics.waterIntake.liters : "--",
      unit: "L",
      icon: Droplets,
      iconColor: "text-blue-500",
      bgColor: "from-accent-blue/70 to-accent-blue/30",
      textColor: "text-blue-700",
    },
  ];

  return (
    <UserLayout>
      <main className="relative p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10 font-sans bg-stone-50 min-h-full">

        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-800">
              Daily Progress
            </h1>

            <p className="text-gray-500 mt-1">
              Your fitness information and daily targets.
            </p>
          </div>

          <div className="bg-surface/80 backdrop-blur-sm px-4 py-2.5 rounded-btn border border-brand-light/60 flex items-center gap-2 w-fit shadow-card">
            <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />

            <span className="text-sm font-bold text-gray-600">
              Metrics Available
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className={`relative overflow-hidden bg-gradient-to-br ${stat.bgColor} p-6 md:p-8 rounded-card border border-brand-light/40 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover`}
              >
                <div className="absolute -right-5 -top-5 opacity-10">
                  <Icon className="w-32 h-32" />
                </div>

                <div className="flex items-center gap-3 mb-5 relative">
                  <div className="p-2.5 bg-surface/80 rounded-btn shadow-xs border border-white/60">
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>

                  <h2 className="text-gray-600 font-extrabold text-xs uppercase tracking-wide">
                    {stat.label}
                  </h2>
                </div>

                <div className="flex items-baseline gap-2 relative">
                  <p className="text-4xl font-extrabold text-gray-800">
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
                    <p className="text-xs text-gray-500 mt-3 relative">
                      Approx.{" "}
                      <span className="font-bold text-gray-700">
                        {metrics.waterIntake.glasses}
                      </span>{" "}
                      glasses per day.
                    </p>
                  )}

                {stat.label === "Daily Calorie Target" && metrics?.tdee && (
                  <p className="text-xs text-gray-500 mt-3 relative">
                    Estimated calories required per day.
                  </p>
                )}
              </div>
            );
          })}
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-gray-800">
              Body Metrics
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Your calculated fitness measurements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card bg-surface/85 border-brand-light/40">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-brand-light/35 rounded-btn">
                  <Scale className="w-5 h-5 text-brand-dark" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-800">BMI</h3>

                  <p className="text-xs text-gray-400">Body Mass Index</p>
                </div>
              </div>

              <p className="text-4xl font-extrabold text-gray-800">
                {metrics?.bmi ?? "--"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Based on your current height and weight.
              </p>
            </div>

            <div className="card bg-surface/85 border-accent-orange/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-accent-orange/45 rounded-btn">
                  <Flame className="w-5 h-5 text-accent-orange-dark" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-800">BMR</h3>

                  <p className="text-xs text-gray-400">Basal Metabolic Rate</p>
                </div>
              </div>

              <p className="text-4xl font-extrabold text-gray-800">
                {metrics?.bmr ? Math.round(metrics.bmr) : "--"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Calories your body needs at rest.
              </p>
            </div>

            <div className="card bg-surface/85 border-accent-blue/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-accent-blue/50 rounded-btn">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>

                <div>
                  <h3 className="font-bold text-gray-800">TDEE</h3>

                  <p className="text-xs text-gray-400">
                    Daily Energy Requirement
                  </p>
                </div>
              </div>

              <p className="text-4xl font-extrabold text-gray-800">
                {metrics?.tdee ? Math.round(metrics.tdee) : "--"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Estimated daily calorie requirement.
              </p>
            </div>
          </div>
        </section>

        <section className="card bg-surface/85 border-brand-light/40 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-brand-light/35 rounded-btn">
              <HeartPulse className="w-5 h-5 text-brand-dark" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-gray-800">
                Your Fitness Profile
              </h2>

              <p className="text-sm text-gray-400">
                Information used for your fitness calculations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-brand-light/15 rounded-btn p-4 border border-brand-light/30">
              <p className="text-xs text-gray-400 mb-1">Weight</p>

              <p className="font-bold text-gray-800">
                {metrics?.weight ?? "--"} kg
              </p>
            </div>

            <div className="bg-accent-blue/15 rounded-btn p-4 border border-accent-blue/30">
              <p className="text-xs text-gray-400 mb-1">Height</p>

              <p className="font-bold text-gray-800">
                {metrics?.height ?? "--"} cm
              </p>
            </div>

            <div className="bg-accent-orange/15 rounded-btn p-4 border border-accent-orange/30">
              <p className="text-xs text-gray-400 mb-1">Age</p>

              <p className="font-bold text-gray-800">
                {metrics?.age ?? "--"} years
              </p>
            </div>

            <div className="bg-brand-light/15 rounded-btn p-4 border border-brand-light/30">
              <p className="text-xs text-gray-400 mb-1">Goal</p>

              <p className="font-bold text-gray-800 capitalize">
                {metrics?.goal ?? "--"}
              </p>
            </div>

            <div className="bg-accent-blue/15 rounded-btn p-4 border border-accent-blue/30">
              <p className="text-xs text-gray-400 mb-1">Gender</p>

              <p className="font-bold text-gray-800 capitalize">
                {metrics?.gender ?? "--"}
              </p>
            </div>

            <div className="bg-accent-orange/15 rounded-btn p-4 border border-accent-orange/30">
              <p className="text-xs text-gray-400 mb-1">Activity Level</p>

              <p className="font-bold text-gray-800 capitalize">
                {metrics?.activityLevel ?? "--"}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-800 uppercase">
                Today's Nutrition
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                {todayDiet?.isExpired
                  ? "Your 3-day diet plan has expired. Please regenerate your plan."
                  : todayDiet?.meals
                  ? `Day ${todayDiet.currentDay} Meals • Target: ${Math.round(
                      todayDiet.targetDailyCalories || 0,
                    )} kcal`
                  : "Your personalized meals will appear here."}
              </p>
            </div>

            <Link
              to="/user/dietplan"
              className="inline-flex items-center gap-1.5 rounded-btn bg-brand-light/30 text-brand-dark hover:bg-brand-light/50 border border-brand-light/40 px-4 py-2 text-xs font-bold transition-all"
            >
              {todayDiet?.isExpired
                ? "Regenerate Plan"
                : todayDiet?.meals
                ? "Full 3-Day Plan"
                : "Create Diet Plan"}
            </Link>
          </div>

          {todayDiet?.isExpired ? (
            <div className="card bg-amber-50/80 border-amber-200 p-6 md:p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-extrabold text-amber-900">
                Your 3-Day Diet Plan Has Expired
              </h3>

              <p className="text-sm text-amber-700 max-w-md mx-auto">
                You have completed Day 3 of your personalized meal plan.
                Generate a new plan to continue tracking your meals!
              </p>

              <div className="pt-2">
                <Link
                  to="/user/dietplan"
                  className="inline-flex items-center gap-2 rounded-btn bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold px-5 py-3 shadow-card transition-all"
                >
                  Regenerate Plan Now
                </Link>
              </div>
            </div>
          ) : todayDiet?.meals ? (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  key: "breakfast",
                  time: "8:00 AM",
                  img: dietData[0].image,
                },
                {
                  key: "lunch",
                  time: "1:30 PM",
                  img: dietData[1].image,
                },
                {
                  key: "snack",
                  time: "4:30 PM",
                  img: dietData[2].image,
                },
                {
                  key: "dinner",
                  time: "8:30 PM",
                  img: dietData[3].image,
                },
              ].map(({ key, time, img }) => {
                const slot = todayDiet.meals[key];

                if (!slot) return null;

                const slotTitle = slot.slot_name || key.toUpperCase();

                const firstDish = slot.items?.[0];

                const dishLabel = firstDish
                  ? `${firstDish.dish_name} (${firstDish.portion_grams}g)`
                  : "Recommended dish";

                const extraDishes = (slot.items?.length || 0) - 1;

                return (
                  <div
                    key={key}
                    className="group bg-surface/90 rounded-card border border-brand-light/30 shadow-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover flex flex-col justify-between"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={img}
                        alt={slotTitle}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      <div className="absolute inset-0  from-black/60 via-transparent to-transparent" />

                      <div className="absolute top-4 left-4">
                        <span className="bg-surface/90 px-3 py-1.5 rounded-btn text-[10px] font-extrabold uppercase text-gray-800 shadow-xs">
                          {time}
                        </span>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                        <h3 className="font-bold text-xl drop-shadow-sm">
                          {slotTitle}
                        </h3>

                        <span className="text-xs font-bold bg-brand px-2 py-0.5 rounded-btn">
                          {slot.total_calories} kcal
                        </span>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="block text-[10px] uppercase font-bold text-gray-400">
                            Calories
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-light/30 text-brand-dark border border-brand-light/40">
                            Day {todayDiet.currentDay}
                          </span>
                        </div>

                        <p className="text-base font-extrabold text-gray-800">
                          {slot.total_calories} kcal
                        </p>

                        <p className="text-xs font-semibold text-gray-600 mt-2 truncate">
                          {dishLabel}
                          {extraDishes > 0 && ` +${extraDishes} more`}
                        </p>
                      </div>

                      <Link
                        to="/user/dietplan"
                        className="block w-full py-2.5 rounded-btn text-xs font-bold text-center bg-stone-50 hover:bg-stone-100 text-gray-700 border border-brand-light/30 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (

            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {dietData.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-surface/90 rounded-card border border-brand-light/30 shadow-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                        <Lock className="h-10 w-10 text-white mb-2" />

                        <p className="text-white text-xs font-semibold">
                          Diet plan not generated yet
                        </p>
                      </div>

                      <div className="absolute top-4 left-4">
                        <span className="bg-surface/90 px-3 py-1.5 rounded-btn text-[10px] font-extrabold uppercase text-gray-800">
                          {item.time}
                        </span>
                      </div>

                      <div className="absolute bottom-4 left-4">
                        <h3 className="font-bold text-white text-xl">
                          {item.name}
                        </h3>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-400">
                            Calories
                          </span>

                          <span className="font-bold text-gray-800">
                            {item.calories}
                          </span>
                        </div>

                        <div className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-brand-light/20 text-gray-500 border border-brand-light/30">
                          {item.status}
                        </div>
                      </div>

                      <Link
                        to="/user/dietplan"
                        className="block w-full py-3 rounded-btn text-xs font-bold text-center bg-gray-800 hover:bg-gray-700 text-white shadow-card transition-all"
                      >
                        Generate Plan
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center text-sm text-gray-500">
                Your personalized diet plan will appear here once it has been
                generated.
              </div>
            </>
          )}
        </section>
      </main>

      {activeRatingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-card border border-brand-light/50 bg-surface/95 p-7 shadow-card-hover backdrop-blur-xl">
            <button
              type="button"
              onClick={handleDismissDialog}
              disabled={submittingRating}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-800 disabled:opacity-50"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-card bg-brand-light/50 border border-brand-light text-2xl font-extrabold text-brand-dark shadow-card">
                {activeRatingSession.professional?.firstName?.[0]?.toUpperCase() ||
                  "P"}
              </div>

              <span className="mt-4 inline-block rounded-full border border-brand-light bg-brand-light/30 px-3 py-1 text-[11px] font-extrabold text-brand-dark uppercase tracking-wider">
                Session Completed
              </span>

              <h2 className="mt-2 text-xl font-extrabold text-gray-800 leading-tight">
                How was your experience with{" "}
                <span className="text-brand-dark">
                  {activeRatingSession.professional?.firstName}{" "}
                  {activeRatingSession.professional?.lastName}
                </span>
                ?
              </h2>

              <p className="mt-1 text-xs text-gray-500 font-medium">
                {activeRatingSession.appointmentDay} •{" "}
                {activeRatingSession.appointmentSlot}
              </p>

              <form onSubmit={handleSubmitRating} className="mt-6 space-y-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 p-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-3xl transition-transform hover:scale-125 focus:outline-none"
                        title={`${star} Stars`}
                      >
                        <span
                          className={
                            star <= (hoverRating || selectedRating)
                              ? "text-amber-400 drop-shadow-xs"
                              : "text-stone-200"
                          }
                        >
                          ★
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="mt-1 text-xs font-extrabold text-gray-700">
                    {hoverRating || selectedRating} out of 5 Stars
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDismissDialog}
                    disabled={submittingRating}
                    className="flex-1 rounded-btn border border-stone-200 bg-stone-100 py-3.5 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-200 disabled:opacity-50"
                  >
                    Maybe Later
                  </button>

                  <button
                    type="submit"
                    disabled={submittingRating}
                    className="flex-1 rounded-btn bg-gray-800 py-3.5 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {submittingRating ? "Submitting..." : "Submit Rating"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
