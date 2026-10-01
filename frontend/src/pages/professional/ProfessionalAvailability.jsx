import { useState, useEffect, useCallback } from "react";

import { useNavigate } from "react-router-dom";

import { z } from "zod";

import { httpClient } from "../../lib/http";

import { getUser, deleteToken } from "../../lib/local-storage";

import {
  Clock3,
  Plus,
  Trash2,
  LogOut,
  AlertTriangle,
} from "lucide-react";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const professionalProfileSchema = z.object({
  profilePhoto: z
    .string()
    .trim()
    .min(1, "Please select and upload a profile photo from your device."),

  specialization: z
    .string()
    .trim()
    .min(2, "Specialization must be at least 2 characters.")
    .max(100, "Specialization must not exceed 100 characters."),

  experience: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) {
        return undefined;
      }

      return Number(value);
    },
    z
      .number()
      .int("Years of experience must be a whole number.")
      .min(0, "Years of experience cannot be negative.")
      .max(50, "Years of experience cannot exceed 50 years.")
      .optional(),
  ),

  sessionFee: z.preprocess(
    (value) => Number(value),
    z
      .number()
      .finite("Please enter a valid session fee.")
      .min(0, "Session fee cannot be negative."),
  ),

  bio: z
    .string()
    .trim()
    .min(10, "Professional bio must be at least 10 characters.")
    .max(1000, "Professional bio must not exceed 1000 characters."),

  credentialDocs: z
    .array(
      z.object({
        title: z.string().optional(),
        fileUrl: z
          .string()
          .trim()
          .min(1, "Credential document is invalid."),
        fileName: z.string().optional(),
        uploadedAt: z.any().optional(),
      }),
    )
    .min(1, "Please upload at least one certificate or credential document."),

  availability: z
    .array(
      z.object({
        day: z.enum([
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ]),
        slots: z
          .array(
            z.string().trim().min(1, "Availability slot is invalid."),
          )
          .min(1, "Each availability day must have at least one slot."),
      }),
    )
    .min(1, "Please configure at least one availability day and slot."),
});

function formatTo12Hour(time24) {
  if (!time24) return "";

  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";

  const modifier = h >= 12 ? "PM" : "AM";

  if (h === 0) {
    h = 12;
  } else if (h > 12) {
    h -= 12;
  }

  const formattedH = h < 10 ? `0${h}` : `${h}`;

  return `${formattedH}:${m} ${modifier}`;
}

function convertTo24Hour(time12) {
  if (!time12) return "";

  const [time, modifier] = time12.split(" ");

  if (!time || !modifier) return "";

  let [hours, minutes] = time.split(":");

  hours = parseInt(hours, 10);

  if (modifier === "AM") {
    if (hours === 12) {
      hours = 0;
    }
  } else if (modifier === "PM") {
    if (hours !== 12) {
      hours += 12;
    }
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function convertToMinutes(time) {
  if (!time) return null;

  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
}

export default function CompleteProfessionalProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => getUser());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [toast, setToast] = useState(null);

  const [photoPreview, setPhotoPreview] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [sessionFee, setSessionFee] = useState(5000);
  const [bio, setBio] = useState("");
  const [credentialDocs, setCredentialDocs] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState("");

  const [availability, setAvailability] = useState([
    {
      day: "Monday",
      slots: ["09:00 AM - 10:00 AM"],
    },
    {
      day: "Wednesday",
      slots: ["09:00 AM - 10:00 AM"],
    },
    {
      day: "Friday",
      slots: ["09:00 AM - 10:00 AM"],
    },
  ]);

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const showToast = useCallback((msg, type = "success") => {
    setToast({
      msg,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      const res = await httpClient.get("/professional/profile");

      const p = res?.data?.professional;

      if (!p) {
        return;
      }

      setUser(p);

      if (p.profilePhoto) {
        setProfilePhotoUrl(p.profilePhoto);
        setPhotoPreview(p.profilePhoto);
      }

      if (p.specialization) {
        setSpecialization(p.specialization);
      }

      if (p.experience !== undefined && p.experience !== null) {
        setExperience(p.experience);
      }

      if (p.sessionFee !== undefined && p.sessionFee !== null) {
        setSessionFee(p.sessionFee);
      }

      if (p.bio) {
        setBio(p.bio);
      }

      if (Array.isArray(p.credentialDocs)) {
        setCredentialDocs(p.credentialDocs);
      }

      if (Array.isArray(p.availability) && p.availability.length > 0) {
        setAvailability(p.availability);
      }

      const status = String(p.professionalStatus || "").toLowerCase();

      if (status === "approved") {
        navigate("/professional/dashboard", {
          replace: true,
        });

        return;
      }
    } catch (error) {
      console.error("Fetch professional profile error:", error);

      showToast(
        error?.response?.data?.message ||
          "Failed to retrieve profile status.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = () => {
    deleteToken();

    navigate("/admin/login", {
      replace: true,
    });
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast(
        "Please select a valid image file (PNG, JPG, WEBP).",
        "error",
      );

      e.target.value = "";

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be under 5MB.", "error");

      e.target.value = "";

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreview(reader.result);
    };

    reader.readAsDataURL(file);

    setUploadingPhoto(true);

    const formData = new FormData();

    formData.append("photo", file);

    try {
      const res = await httpClient.post("/upload/photo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const fileUrl = res?.data?.fileUrl;

      if (!fileUrl) {
        throw new Error(
          "Photo upload response did not contain fileUrl.",
        );
      }

      setProfilePhotoUrl(fileUrl);

      showToast("Profile photo uploaded successfully!");
    } catch (err) {
      console.error("Profile photo upload error:", err);

      setPhotoPreview(profilePhotoUrl);

      showToast(
        err?.response?.data?.message || "Failed to upload photo.",
        "error",
      );
    } finally {
      setUploadingPhoto(false);

      e.target.value = "";
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview("");
    setProfilePhotoUrl("");
  };

  const handleDocSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast(
        "Please select a valid document (PDF, PNG, JPG, WEBP).",
        "error",
      );

      e.target.value = "";

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Document size must be under 10MB.", "error");

      e.target.value = "";

      return;
    }

    const title = (
      newDocTitle || file.name.replace(/\.[^/.]+$/, "")
    ).trim();

    setUploadingDoc(true);

    const formData = new FormData();

    formData.append("document", file);

    try {
      const res = await httpClient.post(
        "/upload/document",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const fileUrl = res?.data?.fileUrl;

      if (!fileUrl) {
        throw new Error(
          "Document upload response did not contain fileUrl.",
        );
      }

      setCredentialDocs((prev) => [
        ...prev,
        {
          title: title || "Certificate Document",
          fileUrl,
          fileName: res?.data?.originalName || file.name,
          uploadedAt: new Date(),
        },
      ]);

      setNewDocTitle("");

      showToast("Credential document uploaded successfully!");
    } catch (err) {
      console.error("Document upload error:", err);

      showToast(
        err?.response?.data?.message || "Failed to upload document.",
        "error",
      );
    } finally {
      setUploadingDoc(false);

      e.target.value = "";
    }
  };

  const handleRemoveDoc = (index) => {
    setCredentialDocs((prev) =>
      prev.filter((_, i) => i !== index),
    );
  };

  const handleAddSlot = () => {
    if (!startTime || !endTime) {
      showToast(
        "Please select both start and end times.",
        "error",
      );

      return;
    }

    if (startTime >= endTime) {
      showToast(
        "Start time must be strictly before end time.",
        "error",
      );

      return;
    }

    const newStartMinutes = convertToMinutes(
      formatTo12Hour(startTime),
    );

    const newEndMinutes = convertToMinutes(
      formatTo12Hour(endTime),
    );

    if (
      newStartMinutes === null ||
      newEndMinutes === null
    ) {
      showToast("Invalid time selected.", "error");

      return;
    }

    const durationMinutes =
      newEndMinutes - newStartMinutes;

    if (durationMinutes !== 60) {
      showToast(
        "Each session slot must be exactly 1 hour long.",
        "error",
      );

      return;
    }

    const formattedSlot = `${formatTo12Hour(
      startTime,
    )} - ${formatTo12Hour(endTime)}`;

    const dayObj = availability.find(
      (item) => item.day === selectedDay,
    );

    const existingSlots = dayObj?.slots || [];

    const hasOverlap = existingSlots.some((slot) => {
      const parts = slot.split(" - ");

      if (parts.length !== 2) {
        return false;
      }

      const existingStartMinutes = convertToMinutes(
        parts[0],
      );

      const existingEndMinutes = convertToMinutes(
        parts[1],
      );

      if (
        existingStartMinutes === null ||
        existingEndMinutes === null
      ) {
        return false;
      }

      return (
        newStartMinutes < existingEndMinutes &&
        newEndMinutes > existingStartMinutes
      );
    });

    if (hasOverlap) {
      showToast(
        "This time slot overlaps with an existing slot.",
        "error",
      );

      return;
    }

    if (dayObj) {
      setAvailability((prev) =>
        prev.map((item) =>
          item.day === selectedDay
            ? {
                ...item,
                slots: [
                  ...(item.slots || []),
                  formattedSlot,
                ],
              }
            : item,
        ),
      );
    } else {
      setAvailability((prev) => [
        ...prev,
        {
          day: selectedDay,
          slots: [formattedSlot],
        },
      ]);
    }
  };

  const handleRemoveSlot = (day, slotIndex) => {
    setAvailability((prev) =>
      prev
        .map((item) =>
          item.day === day
            ? {
                ...item,
                slots: (item.slots || []).filter(
                  (_, i) => i !== slotIndex,
                ),
              }
            : item,
        )
        .filter((item) => item.slots?.length > 0),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validAvailability = availability.filter(
      (item) => item?.day && item?.slots?.length > 0,
    );

    for (const dayItem of validAvailability) {
      for (const slot of dayItem.slots || []) {
        const parts = slot.split(" - ");

        if (parts.length !== 2) {
          showToast(
            `Invalid time slot format on ${dayItem.day}.`,
            "error",
          );

          return;
        }

        const start = convertToMinutes(parts[0]);
        const end = convertToMinutes(parts[1]);

        if (start === null || end === null) {
          showToast(
            `Invalid time format on ${dayItem.day}.`,
            "error",
          );

          return;
        }

        if (start >= end) {
          showToast(
            `Start time must be before end time on ${dayItem.day}.`,
            "error",
          );

          return;
        }

        if (end - start !== 60) {
          showToast(
            `Each session slot must be exactly 1 hour long. Invalid slot on ${dayItem.day}: ${slot}`,
            "error",
          );

          return;
        }
      }
    }

    const validation = professionalProfileSchema.safeParse({
      profilePhoto: profilePhotoUrl,
      specialization,
      experience,
      sessionFee,
      bio,
      credentialDocs,
      availability: validAvailability,
    });

    if (!validation.success) {
      showToast(
        validation.error.issues[0].message,
        "error",
      );

      return;
    }

    const validatedData = validation.data;

    setSubmitting(true);

    try {
      const res = await httpClient.put(
        "/auth/complete-professional-profile",
        {
          profilePhoto: validatedData.profilePhoto,
          specialization: validatedData.specialization,
          experience: validatedData.experience,
          sessionFee: validatedData.sessionFee || 5000,
          bio: validatedData.bio,
          credentialDocs: validatedData.credentialDocs,
          availability: validatedData.availability,
        },
      );

      const updated = res?.data?.professional;

      if (updated) {
        setUser(updated);

        const status = String(
          updated.professionalStatus || "",
        ).toLowerCase();

        if (status === "pending_verification") {
          showToast(
            "Profile submitted successfully. Waiting for admin approval.",
          );

          return;
        }

        if (status === "approved") {
          navigate("/professional/dashboard", {
            replace: true,
          });

          return;
        }
      }

      showToast(
        "Profile application submitted for verification!",
      );
    } catch (err) {
      console.error(
        "Complete professional profile error:",
        err,
      );

      showToast(
        err?.response?.data?.message ||
          "Failed to submit profile.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-light border-t-brand-dark" />

          <p className="text-sm font-semibold text-gray-500">
            Loading your professional profile...
          </p>
        </div>
      </div>
    );
  }

  const professionalStatus = String(
    user?.professionalStatus || "",
  ).toLowerCase();

  if (professionalStatus === "pending_verification") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-8 font-sans">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-light/30 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent-blue/40 blur-3xl" />

        <div className="relative w-full max-w-md rounded-card border border-brand-light/60 bg-surface/90 p-6 shadow-card-hover backdrop-blur-xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-card border border-accent-orange/70 bg-accent-orange/30 text-accent-orange-dark shadow-card">
              <Clock3 className="h-8 w-8" />
            </div>

            <span className="inline-flex rounded-full border border-accent-orange/70 bg-accent-orange/30 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-accent-orange-dark">
              Waiting for Admin Approval
            </span>

            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-800">
              Verification In Progress
            </h2>

            <p className="mt-3 text-sm font-medium leading-relaxed text-gray-500">
              Your professional profile has been submitted
              successfully and is currently being reviewed by
              the PoseFit Admin team.
            </p>
          </div>

          <div className="mt-6 space-y-3 rounded-card border border-brand-light/50 bg-brand-light/10 p-4">
            <p className="text-sm font-extrabold text-gray-800">
              What happens next?
            </p>

            <div className="flex gap-2.5">
              <span className="font-black text-brand-dark">
                1.
              </span>

              <p className="text-xs font-medium leading-relaxed text-gray-500">
                Admin will review your profile, certificates
                and credentials.
              </p>
            </div>

            <div className="flex gap-2.5">
              <span className="font-black text-brand-dark">
                2.
              </span>

              <p className="text-xs font-medium leading-relaxed text-gray-500">
                Once approved, your professional dashboard
                and booking features will become available.
              </p>
            </div>

            <div className="flex gap-2.5">
              <span className="font-black text-brand-dark">
                3.
              </span>

              <p className="text-xs font-medium leading-relaxed text-gray-500">
                You will receive an email notification when
                your application is approved or rejected.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-card border border-accent-orange/60 bg-accent-orange/20 px-4 py-3">
            <p className="text-xs font-bold text-accent-orange-dark">
              Your account is currently awaiting approval.
            </p>

            <p className="mt-1 text-[11px] font-medium text-accent-orange-dark/80">
              Dashboard access will be unlocked after admin
              approval.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={fetchProfile}
              className="flex-1 rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-xs font-bold text-gray-600 transition-all hover:-translate-y-0.5 hover:bg-white hover:text-gray-800"
            >
              Refresh Status
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-btn border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 transition-all hover:-translate-y-0.5 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = professionalStatus === "rejected";

  return (
    <div className="min-h-screen bg-surface px-4 py-6 font-sans sm:py-10">
      <div className="pointer-events-none fixed -left-32 -top-32 h-80 w-80 rounded-full bg-brand-light/25 blur-3xl" />

      <div className="pointer-events-none fixed -bottom-32 -right-32 h-80 w-80 rounded-full bg-accent-blue/30 blur-3xl" />

      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-2xl border px-5 py-3 text-sm font-bold text-white shadow-card-hover transition-all ${
            toast.type === "error"
              ? "border-rose-600 bg-rose-500"
              : "border-brand-dark bg-brand-dark"
          }`}
          style={{
            animation: "modalIn 0.2s ease",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="relative mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-brand-light/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light shadow-xs">
              <span className="text-lg font-black text-brand-dark">
                P
              </span>
            </div>

            <div>
              <p className="font-extrabold leading-none tracking-tight text-gray-800">
                PoseFit
              </p>

              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-brand-dark">
                Professional Onboarding
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-btn border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition-all hover:-translate-y-0.5 hover:bg-rose-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>

        {isRejected && (
          <div className="mb-6 rounded-card border border-rose-200 bg-rose-50/80 p-5 shadow-card">
            <p className="flex items-center gap-2 text-xs font-extrabold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              Application Requires Updates
            </p>

            <p className="mt-2 rounded-xl border border-rose-200 bg-white/80 p-3 text-xs font-semibold text-rose-800">
              <span className="font-extrabold">
                Admin Feedback:
              </span>{" "}
              {user?.rejectionReason ||
                "Please update your credentials or bio."}
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-card border border-brand-light/60 bg-surface/90 p-5 shadow-card-hover backdrop-blur-xl sm:p-8"
        >
          <div>
            <span className="inline-flex rounded-full border border-brand-light/70 bg-brand-light/30 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
              Step 1 of 1
            </span>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
              Complete Your Professional Profile
            </h1>

            <p className="mt-1.5 text-xs font-medium leading-relaxed text-gray-500">
              Please complete your details, upload your
              credentials, and configure your weekly
              availability schedule.
            </p>
          </div>

          <div className="space-y-3 border-t border-brand-light/40 pt-5">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-gray-700">
              Profile Photo{" "}
              <span className="text-rose-500">*</span>
            </label>

            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              {photoPreview ? (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-card border border-brand-light/60 bg-white shadow-card">
                  <img
                    src={photoPreview}
                    alt="Profile Preview"
                    className="h-full w-full object-cover"
                  />

                  {uploadingPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-card border border-dashed border-brand-light bg-brand-light/10 p-2 text-center text-xs font-bold text-gray-400">
                  No Image Selected
                </div>
              )}

              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-brand-light/70 bg-brand-light/25 px-4 py-2.5 text-xs font-bold text-brand-dark transition-all hover:-translate-y-0.5 hover:bg-brand-light/40">
                  <span>
                    {photoPreview
                      ? "Change Photo"
                      : "Select Photo from Device"}
                  </span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePhotoSelect}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>

                {photoPreview && (
                  <div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-xs font-bold text-rose-600 transition-colors hover:text-rose-700 hover:underline"
                    >
                      Remove Photo
                    </button>
                  </div>
                )}

                <p className="text-[11px] font-medium text-gray-400">
                  PNG, JPG, WEBP up to 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Professional Role (Admin Set)
              </label>

              <div className="flex items-center justify-between rounded-btn border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700">
                <span>
                  {user?.professionalType || "Trainer"}
                </span>

                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-gray-600">
                  Locked
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Specialization{" "}
                <span className="text-rose-500">*</span>
              </label>

              <input
                type="text"
                required
                placeholder="e.g. Strength, Weight Loss, HIIT"
                value={specialization}
                onChange={(e) =>
                  setSpecialization(e.target.value)
                }
                className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Session Fee (Rs.){" "}
                <span className="text-rose-500">*</span>
              </label>

              <input
                type="number"
                min="0"
                required
                value={sessionFee}
                onChange={(e) =>
                  setSessionFee(e.target.value)
                }
                className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Years of Experience
              </label>

              <input
                type="number"
                min="0"
                max="50"
                placeholder="e.g. 5"
                value={experience}
                onChange={(e) =>
                  setExperience(e.target.value)
                }
                className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Bio / Background Description{" "}
                <span className="text-rose-500">*</span>
              </label>

              <textarea
                rows={3}
                required
                placeholder="Share your coaching philosophy, years of experience, and certifications..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full resize-none rounded-btn border border-gray-200 bg-white/70 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-brand-light/40 pt-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Certificates & Credentials{" "}
                <span className="text-rose-500">*</span>
              </label>

              <span className="text-xs font-medium text-gray-400">
                Private for Admin verification
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Certificate Title (e.g. ACE Certified)"
                value={newDocTitle}
                onChange={(e) =>
                  setNewDocTitle(e.target.value)
                }
                className="min-w-0 flex-1 rounded-btn border border-gray-200 bg-white/70 px-4 py-2.5 text-xs font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
              />

              <label
                className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-btn bg-gray-800 px-4 py-2.5 text-xs font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover ${
                  uploadingDoc
                    ? "cursor-not-allowed opacity-60"
                    : ""
                }`}
              >
                <Plus className="h-3.5 w-3.5" />

                <span>
                  {uploadingDoc
                    ? "Uploading Document..."
                    : "Select & Upload Document"}
                </span>

                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleDocSelect}
                  disabled={uploadingDoc}
                  className="hidden"
                />
              </label>
            </div>

            {credentialDocs.length > 0 && (
              <div className="space-y-2 pt-2">
                {credentialDocs.map((doc, idx) => (
                  <div
                    key={`${doc.fileUrl || doc.fileName || "doc"}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-brand-light/40 bg-brand-light/10 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand-light/50 text-xs font-black text-brand-dark">
                        ✓
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-800">
                          {doc.title ||
                            "Certificate Document"}
                        </p>

                        <p className="truncate text-[10px] font-medium text-gray-400">
                          {doc.fileName ||
                            "Uploaded Document"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(idx)}
                      className="shrink-0 rounded-xl p-1.5 text-rose-600 transition-all hover:bg-rose-50 hover:text-rose-700"
                      aria-label="Remove document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-brand-light/40 pt-5">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700">
                Availability Schedule (1-Hour Sessions)
              </label>

              <p className="mt-1 text-[11px] font-medium text-gray-400">
                Each availability slot must be exactly 1 hour long.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-card border border-brand-light/50 bg-brand-light/10 p-4">
              <div className="w-full sm:w-36">
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
                  Day
                </label>

                <select
                  value={selectedDay}
                  onChange={(e) =>
                    setSelectedDay(e.target.value)
                  }
                  className="w-full rounded-btn border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
                  Start Time
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) =>
                    setStartTime(e.target.value)
                  }
                  className="w-full rounded-btn border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60 sm:w-auto"
                />
              </div>

              <div className="w-full sm:w-auto">
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
                  End Time
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) =>
                    setEndTime(e.target.value)
                  }
                  className="w-full rounded-btn border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60 sm:w-auto"
                />
              </div>

              <button
                type="button"
                onClick={handleAddSlot}
                className="flex items-center gap-1.5 rounded-btn border border-brand-light/70 bg-brand-light/30 px-4 py-2 text-xs font-extrabold text-brand-dark transition-all hover:-translate-y-0.5 hover:bg-brand-light/50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Slot
              </button>
            </div>

            <div className="space-y-2">
              {availability.map((item) => (
                <div
                  key={item.day}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-brand-light/40 bg-white/70 p-3 transition-all hover:border-brand-light/70"
                >
                  <span className="w-24 shrink-0 text-xs font-black text-gray-800">
                    {item.day}
                  </span>

                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {(item.slots || []).map(
                      (slot, sIdx) => (
                        <span
                          key={`${slot}-${sIdx}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-light/60 bg-brand-light/15 px-2.5 py-1 text-[11px] font-bold text-gray-700"
                        >
                          <Clock3 className="h-3 w-3 text-brand-dark" />

                          {slot}

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveSlot(
                                item.day,
                                sIdx,
                              )
                            }
                            className="ml-0.5 text-gray-400 transition-colors hover:text-rose-600"
                            aria-label="Remove slot"
                          >
                            ×
                          </button>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-brand-light/40 pt-5">
            <button
              type="submit"
              disabled={
                submitting ||
                uploadingPhoto ||
                uploadingDoc
              }
              className="w-full rounded-btn bg-gray-800 px-6 py-3.5 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submitting
                ? "Submitting Application..."
                : "Submit Profile for Admin Verification"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }

          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
