import { useCallback, useEffect, useState } from "react";

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
  if (years === undefined || years === null || years === "" || isNaN(n) || n < 0) return "Not specified";
  return n === 1 ? "1 Year" : `${n} Years`;
}

export default function PublicProfessionals() {
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPublicProfessionals = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await httpClient.get("/user/public-professionals");

      const professionalsData = data?.professionals || [];

      setProfessionals(professionalsData);
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

    const fallback = event.currentTarget.parentElement?.querySelector(
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

  if (loading) {
    return (
      <UserLayout>
        <div className="flex min-h-full items-center justify-center bg-transparent p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />

            <p className="font-medium text-gray-500">
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

        <section className="border-b border-brand-light/50 bg-surface/75 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-dark" />

                <span className="text-sm font-bold uppercase tracking-wide text-brand-dark">
                  Certified Professionals
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-gray-800 sm:text-4xl md:text-5xl">
                Find Your Perfect{" "}
                <span className="text-brand-dark">Fitness Professional</span>
              </h1>

              <p className="mt-4 text-base text-gray-500 sm:text-lg">
                Connect with certified trainers and fitness professionals who
                can help you achieve your goals.
              </p>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                Certified Professionals
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {professionals.length} professional
                {professionals.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

            {professionals.length === 0 ? (
            <div className="rounded-card border border-brand-light/50 bg-surface/80 p-16 text-center shadow-card backdrop-blur-xl">
              <UserRound className="mx-auto mb-4 h-14 w-14 text-gray-300" />

              <h3 className="text-xl font-bold text-gray-800">
                No professionals found
              </h3>

              <p className="mt-2 text-gray-500">
                There are currently no certified professionals available.
              </p>
            </div>
          ) : (

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {professionals.map((professional) => {
                const imageUrl = getProfileImage(professional.profilePhoto);

                const initials = `${professional.firstName?.[0] || ""}${
                  professional.lastName?.[0] || ""
                }`.toUpperCase();

                return (
                  <div
                    key={professional._id}
                    className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  >

                    <div className="p-6">

                      <div className="flex items-start gap-4">

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
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-black text-gray-800">
                              {professional.firstName} {professional.lastName}
                            </h3>

                            {professional.isVerified && (
                              <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
                            )}
                          </div>

                          <p className="mt-1 text-sm font-semibold text-brand-dark">
                            {professional.professionalType ||
                              "Fitness Professional"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />

                          <span className="font-bold text-gray-800">
                            {professional.rating?.average
                              ? Number(professional.rating.average).toFixed(1)
                              : "5.0"}
                          </span>
                        </div>

                        <span className="text-sm text-gray-400">
                          ({professional.rating?.count || 0} reviews)
                        </span>
                      </div>

                 <div className="mt-5 grid grid-cols-2 gap-3">

                        <div className="rounded-btn border border-brand-light/40 bg-brand-light/10 p-3">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Award className="h-4 w-4" />

                            <span className="text-xs font-semibold">
                              Experience
                            </span>
                          </div>

                          <p className="mt-1 font-bold text-gray-800">
                            {formatExperience(professional.experience)}
                          </p>
                        </div>

                        <div className="rounded-btn border border-brand-light/40 bg-brand-light/10 p-3">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="h-4 w-4" />

                            <span className="text-xs font-semibold">
                              Session
                            </span>
                          </div>

                          <p className="mt-1 font-bold text-gray-800">
                            {professional.sessionFee
                              ? `Rs. ${Number(professional.sessionFee).toLocaleString()}`
                              : "Free"}
                          </p>
                        </div>
                      </div>

                       <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-brand" />

                        <span>
                          {professional.availability?.length
                            ? "Available for sessions"
                            : "Availability not set"}
                        </span>
                      </div>
                    </div>

                   <div className="border-t border-brand-light/40 p-4">
                      <button
                        onClick={() => handleViewProfile(professional._id)}
                        className="flex w-full items-center justify-center gap-2 rounded-btn bg-gray-800 px-4 py-3 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover"
                      >
                        View Profile & Availability
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </UserLayout>
  );
}
