import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Star,
  Award,
  Calendar,
  Clock,
  ChevronRight,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { toast } from "sonner";

import { httpClient } from "../../lib/http";

import UserLayout from "../../components/user/UserLayout";

function formatExperience(years) {
  const n = Number(years);

  if (
    years === undefined ||
    years === null ||
    years === "" ||
    isNaN(n) ||
    n < 0
  ) {
    return "Not specified";
  }

  return n === 1 ? "1 Year" : `${n} Years`;
}

export default function PublicProfessionals() {
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All");

  const fetchPublicProfessionals = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await httpClient.get("/user/public-professionals");

      setProfessionals(data?.professionals || []);
    } catch (error) {
      console.error("Fetch professionals error:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load certified professionals";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicProfessionals();
  }, [fetchPublicProfessionals]);

  const getProfileImage = (profilePhoto) => {
    if (!profilePhoto) {
      return null;
    }

    if (
      profilePhoto.startsWith("http://") ||
      profilePhoto.startsWith("https://")
    ) {
      return profilePhoto;
    }

    const baseURL =
      import.meta.env.VITE_BASE_URL || "http://localhost:4000/api";

    const backendURL = baseURL.replace(/\/api\/?$/, "");

    if (profilePhoto.startsWith("/")) {
      return `${backendURL}${profilePhoto}`;
    }

    return `${backendURL}/${profilePhoto}`;
  };

  const handleImageError = (event) => {
    event.currentTarget.style.display = "none";

    const fallback =
      event.currentTarget.parentElement?.querySelector(
        ".profile-image-fallback",
      );

    if (fallback) {
      fallback.classList.remove("hidden");
    }
  };

  const handleViewProfile = (id) => {
    if (!id) {
      toast.error("Professional ID not found");
      return;
    }

    navigate(`/user/professionals/${id}`);
  };

  const filteredProfessionals = useMemo(() => {
    if (selectedType === "All") {
      return professionals;
    }

    return professionals.filter((professional) => {
      const type = String(
        professional.professionalType || "",
      ).trim().toLowerCase();

      if (selectedType === "Trainer") {
        return type === "trainer" || type === "fitness trainer";
      }

      if (selectedType === "Nutritionist") {
        return (
          type === "nutritionist" ||
          type === "nutritionist/dietitian" ||
          type === "dietitian"
        );
      }

      return true;
    });
  }, [professionals, selectedType]);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex min-h-full items-center justify-center bg-transparent p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-brand border-t-transparent" />

            <p className="text-sm font-medium text-gray-500">
              Loading certified professionals...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-full bg-transparent font-sans">
        <section className="border-b border-gray-200 bg-surface/60 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand" />

                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Certified Professionals
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">
                  Find a Fitness Professional
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                  Explore certified professionals and find the right person
                  for your fitness and wellness goals.
                </p>
              </div>

              <div className="shrink-0 text-sm text-gray-500">
                <span className="font-semibold text-gray-800">
                  {filteredProfessionals.length}
                </span>{" "}
                professional
                {filteredProfessionals.length !== 1 ? "s" : ""} available
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">
                Browse by Professional Type
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Choose a category to view matching professionals.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["All", "Trainer", "Nutritionist"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-btn border px-4 py-2.5 text-xs font-bold transition-all ${
                    selectedType === type
                      ? "border-brand-dark bg-brand-dark text-white shadow-card"
                      : "border-brand-light/50 bg-surface/70 text-gray-700 hover:border-brand hover:bg-brand-light/20"
                  }`}
                >
                  {type === "All"
                    ? "All Professionals"
                    : `${type}s`}
                </button>
              ))}
            </div>
          </div>

          {filteredProfessionals.length === 0 ? (
            <div className="rounded-card border border-gray-200 bg-surface/70 px-6 py-16 text-center shadow-sm">
              <UserRound className="mx-auto mb-4 h-12 w-12 text-gray-300" />

              <h3 className="text-lg font-bold text-gray-800">
                No professionals found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                {selectedType === "All"
                  ? "There are currently no certified professionals available."
                  : `There are currently no certified ${selectedType.toLowerCase()}s available.`}
              </p>

              {selectedType !== "All" && professionals.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedType("All")}
                  className="mt-5 rounded-btn bg-gray-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-gray-700"
                >
                  View All Professionals
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredProfessionals.map((professional) => {
                const imageUrl = getProfileImage(
                  professional.profilePhoto,
                );

                const initials =
                  `${professional.firstName?.[0] || ""}${
                    professional.lastName?.[0] || ""
                  }`.toUpperCase();

                const rating = professional.rating?.average
                  ? Number(professional.rating.average).toFixed(1)
                  : "5.0";

                const reviewCount =
                  professional.rating?.count || 0;

                return (
                  <article
                    key={professional._id}
                    className="group flex h-full flex-col overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-brand-light hover:shadow-card-hover"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 shrink-0">
                          <div
                            className={`profile-image-fallback ${
                              imageUrl ? "hidden" : ""
                            } flex h-16 w-16 items-center justify-center rounded-card bg-brand-light/40 text-xl font-black text-brand-dark`}
                          >
                            {initials || "U"}
                          </div>

                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt={`${professional.firstName || ""} ${
                                professional.lastName || ""
                              }`}
                              className="h-16 w-16 rounded-card border border-brand-light/60 object-cover shadow-sm"
                              onError={handleImageError}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h2 className="truncate text-base font-bold text-gray-800">
                              {professional.firstName}{" "}
                              {professional.lastName}
                            </h2>

                            {professional.isVerified && (
                              <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
                            )}
                          </div>

                          <p className="mt-1 truncate text-sm text-gray-500">
                            {professional.professionalType ||
                              "Fitness Professional"}
                          </p>

                          <div className="mt-2 flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />

                            <span className="text-sm font-semibold text-gray-800">
                              {rating}
                            </span>

                            <span className="text-xs text-gray-400">
                              ({reviewCount}{" "}
                              {reviewCount === 1
                                ? "review"
                                : "reviews"}
                              )
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-7 grid grid-cols-2 rounded-btn border-y border-gray-100 py-4">
                        <div className="flex items-center gap-3 border-r border-gray-100 pr-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-brand-light/30">
                            <Award className="h-4 w-4 text-brand-dark" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Experience
                            </p>

                            <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
                              {formatExperience(
                                professional.experience,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-brand-light/30">
                            <Clock className="h-4 w-4 text-brand-dark" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Session Fee
                            </p>

                            <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
                              {professional.sessionFee
                                ? `Rs. ${Number(
                                    professional.sessionFee,
                                  ).toLocaleString()}`
                                : "Free"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-brand" />

                        <span className="text-sm text-gray-500">
                          {professional.availability?.length
                            ? "Available for sessions"
                            : "Availability not set"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-brand-light/40 p-4">
                      <button
                        onClick={() =>
                          handleViewProfile(professional._id)
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-btn bg-gray-800 px-4 py-3 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover"
                      >
                        View Profile

                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </UserLayout>
  );
}

