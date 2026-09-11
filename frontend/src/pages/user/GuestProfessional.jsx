import { useCallback, useEffect, useState } from "react";

import { Star, Award, ShieldCheck, UserRound } from "lucide-react";

import { toast } from "sonner";
import { Link } from "react-router-dom";
import { httpClient } from "../../lib/http";

function formatExperience(years) {
  const n = Number(years);
  if (years === undefined || years === null || years === "" || isNaN(n) || n < 0) return "Not specified";
  return n === 1 ? "1 Year" : `${n} Years`;
}

export default function GuestProfessionals() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // GET PUBLIC PROFESSIONALS
  // =====================================================

  const fetchPublicProfessionals = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await httpClient.get("/user/public-professionals");

      const professionalsData = data?.professionals || [];

      setProfessionals(professionalsData);
    } catch (error) {
      console.error("Fetch guest professionals error:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load professionals";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // FETCH ON LOAD
  // =====================================================

  useEffect(() => {
    fetchPublicProfessionals();
  }, [fetchPublicProfessionals]);

  // =====================================================
  // PROFILE IMAGE
  // =====================================================

  const getProfileImage = (profilePhoto) => {
    if (!profilePhoto) return null;

    // Full URL
    if (
      profilePhoto.startsWith("http://") ||
      profilePhoto.startsWith("https://")
    ) {
      return profilePhoto;
    }

    const baseURL =
      import.meta.env.VITE_BASE_URL || "http://localhost:4000/api";

    // Remove /api from backend URL
    const backendURL = baseURL.replace(/\/api\/?$/, "");

    if (profilePhoto.startsWith("/")) {
      return `${backendURL}${profilePhoto}`;
    }

    return `${backendURL}/${profilePhoto}`;
  };

  // =====================================================
  // IMAGE ERROR
  // =====================================================

  const handleImageError = (event) => {
    event.currentTarget.style.display = "none";

    const fallback = event.currentTarget.parentElement?.querySelector(
      ".profile-image-fallback",
    );

    if (fallback) {
      fallback.classList.remove("hidden");
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <section
        id="professionals"
        className="bg-transparent px-4 py-16 font-sans sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-light border-t-brand" />

            <p className="text-sm font-medium text-gray-500">
              Loading professionals...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="professionals"
      className="bg-transparent px-4 py-16 font-sans sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        {/* =========================
            SECTION HEADER
        ========================== */}

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-dark" />

            <span className="text-sm font-bold uppercase tracking-widest text-brand-dark">
              Certified Professionals
            </span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-gray-800 sm:text-4xl lg:text-5xl">
            Meet Our{" "}
            <span className="text-brand-dark">Fitness Professionals</span>
          </h2>

          <p className="mt-4 text-base leading-relaxed text-gray-500 sm:text-lg">
            Explore our certified fitness professionals and find the right
            expert to support your fitness journey.
          </p>
        </div>

        {/* =========================
            RESULT COUNT
        ========================== */}

        <div className="mt-10 flex items-end justify-between border-b border-brand-light/40 pb-4">
          <div>
            <h3 className="text-xl font-black text-gray-800">
              Our Professionals
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {professionals.length} professional
              {professionals.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {/* =========================
            EMPTY STATE
        ========================== */}

        {professionals.length === 0 ? (
          <div className="py-20 text-center">
            <UserRound className="mx-auto mb-4 h-14 w-14 text-gray-300" />

            <h3 className="text-xl font-bold text-gray-800">
              No professionals found
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              There are currently no professionals available.
            </p>
          </div>
        ) : (
          /* =========================
             PROFESSIONAL LIST
          ========================== */

          <div className="divide-y divide-brand-light/40">
            {professionals.map((professional) => {
              const imageUrl = getProfileImage(professional.profilePhoto);

              const initials = `${professional.firstName?.[0] || ""}${
                professional.lastName?.[0] || ""
              }`.toUpperCase();

              return (
                <div
                  key={professional._id}
                  className="group py-7 transition-all duration-300 hover:bg-brand-light/5 sm:py-8"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                    {/* =========================
                        PROFILE
                    ========================== */}

                    <div className="flex min-w-0 flex-1 items-center gap-5">
                      {/* Profile Image */}

                      <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                        {/* Fallback */}

                        <div
                          className={`profile-image-fallback ${
                            imageUrl ? "hidden" : ""
                          } flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-light/40 text-xl font-black text-brand-dark sm:h-24 sm:w-24 sm:text-2xl`}
                        >
                          {initials || "U"}
                        </div>

                        {/* Image */}

                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={`${professional.firstName || ""} ${
                              professional.lastName || ""
                            }`}
                            className="h-20 w-20 rounded-2xl border border-brand-light/60 object-cover shadow-sm transition-transform duration-300 group-hover:scale-[1.03] sm:h-24 sm:w-24"
                            onError={handleImageError}
                          />
                        )}
                      </div>

                      {/* Professional Name & Details */}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-gray-800 sm:text-xl">
                            {professional.firstName} {professional.lastName}
                          </h3>

                          {professional.isVerified && (
                            <ShieldCheck
                              className="h-5 w-5 text-brand"
                              title="Verified Professional"
                            />
                          )}
                        </div>

                        <p className="mt-1 text-sm font-bold text-brand-dark">
                          {professional.professionalType ||
                            "Fitness Professional"}
                        </p>

                        {professional.specialization && (
                          <p className="mt-1 max-w-xl text-sm font-medium text-gray-500">
                            {professional.specialization}
                          </p>
                        )}

                        {/* Rating */}

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

                            <span className="text-sm font-bold text-gray-800">
                              {professional.rating?.average
                                ? Number(professional.rating.average).toFixed(1)
                                : "5.0"}
                            </span>
                          </div>

                          <span className="text-sm text-gray-400">
                            {professional.rating?.count || 0} reviews
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* =========================
                        PROFESSIONAL INFO
                    ========================== */}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px] lg:grid-cols-3">
                      {/* Experience */}

                      <div className="border-l border-brand-light/50 pl-4">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Award className="h-4 w-4" />

                          <span className="text-xs font-semibold uppercase tracking-wide">
                            Experience
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm font-bold text-gray-800">
                          {formatExperience(professional.experience)}
                        </p>
                      </div>

                      {/* Session Fee */}

                      <div className="border-l border-brand-light/50 pl-4">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-xs font-bold text-gray-500">Rs.</span>

                          <span className="text-xs font-semibold uppercase tracking-wide">
                            Session
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-bold text-gray-800">
                          {professional.sessionFee
                            ? `Rs. ${Number(professional.sessionFee).toLocaleString()}`
                            : "Contact"}
                        </p>
                      </div>

                      {/* Status */}

                      <div className="col-span-2 border-l border-brand-light/50 pl-4 sm:col-span-1">
                        <div className="flex items-center gap-2 text-gray-400">
                          <ShieldCheck className="h-4 w-4" />

                          <span className="text-xs font-semibold uppercase tracking-wide">
                            Status
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-bold text-brand-dark">
                          {professional.isVerified
                            ? "Verified"
                            : "Professional"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* =========================
                      GUEST BOOKING MESSAGE
                  ========================== */}

                  <div className="mt-5 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-medium text-gray-400">
                      Want to view availability and book a session?{" "}
                      <Link
                        to="/user/login"
                        className="font-bold text-brand-dark underline underline-offset-2 transition-colors hover:text-brand"
                      >
                        Sign in
                      </Link>{" "}
                      to continue.
                    </p>

                    {professional.isVerified && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-brand-dark">
                        <ShieldCheck className="h-4 w-4" />
                        Verified Professional
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================
            BOTTOM CTA
        ========================== */}

        {professionals.length > 0 && (
          <div className="mt-10 border-t border-brand-light/40 pt-8 text-center">
            <p className="text-sm text-gray-500">
              Want to view availability and book a session?{" "}
              <Link
                to="/user/login"
                className="font-bold text-brand-dark underline underline-offset-2 transition-colors hover:text-brand"
              >
                Sign in
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
