import { useCallback, useEffect, useState } from "react";

import {
  Search,
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

export default function PublicProfessionals() {
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // =====================================================
  // GET PUBLIC PROFESSIONALS
  // =====================================================

  const fetchPublicProfessionals = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await httpClient.get("/user/public-professionals");

      const professionalsData = data?.professionals || [];

      setProfessionals(professionalsData);
      setFilteredProfessionals(professionalsData);
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

  // =====================================================
  // FETCH ON LOAD
  // =====================================================

  useEffect(() => {
    fetchPublicProfessionals();
  }, [fetchPublicProfessionals]);

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  useEffect(() => {
    let result = [...professionals];

    // Filter by professional type
    if (filter !== "all") {
      result = result.filter(
        (professional) =>
          professional.professionalType?.toLowerCase() === filter.toLowerCase(),
      );
    }

    // Search
    if (search.trim()) {
      const searchValue = search.trim().toLowerCase();

      result = result.filter((professional) => {
        const fullName = `${professional.firstName || ""} ${
          professional.lastName || ""
        }`.toLowerCase();

        const type = professional.professionalType?.toLowerCase() || "";

        return fullName.includes(searchValue) || type.includes(searchValue);
      });
    }

    setFilteredProfessionals(result);
  }, [professionals, search, filter]);

  // =====================================================
  // PROFILE IMAGE
  // =====================================================

  const getProfileImage = (profilePhoto) => {
    if (!profilePhoto) {
      return null;
    }

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
  // VIEW PROFILE
  // =====================================================

  const handleViewProfile = (id) => {
    if (!id) {
      toast.error("Professional ID not found");
      return;
    }

    navigate(`/user/professionals/${id}`);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-full bg-transparent flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />

            <p className="text-gray-500 font-medium">
              Loading certified professionals...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <UserLayout>
      <div className="min-h-full bg-transparent font-sans">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="border-b border-brand-light/50 bg-surface/75 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-brand-dark" />

                <span className="text-sm font-bold text-brand-dark uppercase tracking-wide">
                  Certified Professionals
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-800">
                Find Your Perfect{" "}
                <span className="text-brand-dark">Fitness Professional</span>
              </h1>

              <p className="mt-4 text-gray-500 text-base sm:text-lg">
                Connect with certified trainers and fitness professionals who
                can help you achieve your goals.
              </p>
            </div>

            {/* =================================================
                SEARCH + FILTER
            ================================================= */}

            <div className="mt-8 flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search professionals..."
                  className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-btn border border-gray-200 bg-white/70 text-sm sm:text-base text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                />
              </div>

              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-5 py-3.5 sm:py-4 rounded-btn border border-gray-200 bg-white/70 text-sm sm:text-base text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
              >
                <option value="all">All Professionals</option>
                <option value="trainer">Trainer</option>
                <option value="coach">Coach</option>
              </select>
            </div>
          </div>
        </section>

        {/* =====================================================
            PROFESSIONALS
        ===================================================== */}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                Certified Professionals
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {filteredProfessionals.length} professional
                {filteredProfessionals.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {filteredProfessionals.length === 0 ? (
            <div className="rounded-card border border-brand-light/50 bg-surface/80 p-16 text-center shadow-card backdrop-blur-xl">
              <UserRound className="w-14 h-14 text-gray-300 mx-auto mb-4" />

              <h3 className="text-xl font-bold text-gray-800">
                No professionals found
              </h3>

              <p className="text-gray-500 mt-2">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            /* =================================================
               PROFESSIONAL CARDS
            ================================================= */

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProfessionals.map((professional) => {
                const imageUrl = getProfileImage(professional.profilePhoto);

                const initials = `${professional.firstName?.[0] || ""}${
                  professional.lastName?.[0] || ""
                }`.toUpperCase();

                return (
                  <div
                    key={professional._id}
                    className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  >
                    {/* =================================================
                        CARD CONTENT
                    ================================================= */}

                    <div className="p-6">
                      {/* Profile Header */}
                      <div className="flex items-start gap-4">
                        {/* Profile Image */}
                        <div className="relative w-16 h-16 shrink-0">
                          {/* Fallback */}
                          <div
                            className={`profile-image-fallback ${
                              imageUrl ? "hidden" : ""
                            } w-16 h-16 rounded-card flex items-center justify-center bg-brand-light/40 text-brand-dark font-black text-xl`}
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
                              className="w-16 h-16 rounded-card object-cover border border-brand-light/60 shadow-sm"
                              onError={handleImageError}
                            />
                          )}
                        </div>

                        {/* Name */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-gray-800 truncate">
                              {professional.firstName} {professional.lastName}
                            </h3>

                            {professional.isVerified && (
                              <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
                            )}
                          </div>

                          <p className="text-sm text-brand-dark font-semibold mt-1">
                            {professional.professionalType ||
                              "Fitness Professional"}
                          </p>
                        </div>
                      </div>

                      {/* =================================================
                          RATING
                      ================================================= */}

                      <div className="flex items-center gap-2 mt-5">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />

                          <span className="font-bold text-gray-800">
                            {professional.rating?.average
                              ? Number(professional.rating.average).toFixed(1)
                              : "5.0"}
                          </span>
                        </div>

                        <span className="text-gray-400 text-sm">
                          ({professional.rating?.count || 0} reviews)
                        </span>
                      </div>

                      {/* =================================================
                          INFO
                      ================================================= */}

                      <div className="grid grid-cols-2 gap-3 mt-5">
                        {/* Experience */}
                        <div className="rounded-btn border border-brand-light/40 bg-brand-light/10 p-3">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Award className="w-4 h-4" />

                            <span className="text-xs font-semibold">
                              Experience
                            </span>
                          </div>

                          <p className="font-bold text-gray-800 mt-1">
                            {professional.experience || "Professional"}
                          </p>
                        </div>

                        {/* Session */}
                        <div className="rounded-btn border border-brand-light/40 bg-brand-light/10 p-3">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />

                            <span className="text-xs font-semibold">
                              Session
                            </span>
                          </div>

                          <p className="font-bold text-gray-800 mt-1">
                            {professional.sessionFee
                              ? `$${professional.sessionFee}`
                              : "Free"}
                          </p>
                        </div>
                      </div>

                      {/* =================================================
                          AVAILABILITY
                      ================================================= */}

                      <div className="flex items-center gap-2 mt-5 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 text-brand" />

                        <span>
                          {professional.availability?.length
                            ? "Available for sessions"
                            : "Availability not set"}
                        </span>
                      </div>
                    </div>

                    {/* =================================================
                        VIEW PROFILE BUTTON
                    ================================================= */}

                    <div className="border-t border-brand-light/40 p-4">
                      <button
                        onClick={() => handleViewProfile(professional._id)}
                        className="w-full flex items-center justify-center gap-2 rounded-btn bg-gray-800 px-4 py-3 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover"
                      >
                        View Profile & Availability
                        <ChevronRight className="w-4 h-4" />
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
