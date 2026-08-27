import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { getUser, deleteToken } from "../../lib/local-storage";

import {
  IconClock,
  IconPlus,
  IconTrash,
  IconLogOut,
  IconAlertTriangle,
} from "../../components/admin/Icons";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Convert 24-hour HH:MM to 12-hour HH:MM AM/PM
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

// Convert 12-hour time to 24-hour time
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

export default function CompleteProfessionalProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => getUser());

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [toast, setToast] = useState(null);

  // =========================
  // Form State
  // =========================

  const [photoPreview, setPhotoPreview] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const [specialization, setSpecialization] = useState("");
  const [sessionFee, setSessionFee] = useState(50);
  const [bio, setBio] = useState("");

  const [credentialDocs, setCredentialDocs] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState("");

  const [availability, setAvailability] = useState([
    {
      day: "Monday",
      slots: ["09:00 AM - 12:00 PM", "02:00 PM - 05:00 PM"],
    },
    {
      day: "Wednesday",
      slots: ["09:00 AM - 12:00 PM"],
    },
    {
      day: "Friday",
      slots: ["09:00 AM - 12:00 PM", "02:00 PM - 05:00 PM"],
    },
  ]);

  // Slot input state
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");

  // =========================
  // Toast
  // =========================

  const showToast = useCallback((msg, type = "success") => {
    setToast({
      msg,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // =========================
  // Fetch Professional Profile
  // =========================

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      const res = await httpClient.get("/professional/profile");

      const p = res?.data?.professional;

      if (!p) {
        return;
      }

      setUser(p);

      // Profile photo
      if (p.profilePhoto) {
        setProfilePhotoUrl(p.profilePhoto);
        setPhotoPreview(p.profilePhoto);
      }

      // Specialization
      if (p.specialization) {
        setSpecialization(p.specialization);
      }

      // Session fee
      if (p.sessionFee !== undefined && p.sessionFee !== null) {
        setSessionFee(p.sessionFee);
      }

      // Bio
      if (p.bio) {
        setBio(p.bio);
      }

      // Credential documents
      if (Array.isArray(p.credentialDocs)) {
        setCredentialDocs(p.credentialDocs);
      }

      // Availability
      if (Array.isArray(p.availability) && p.availability.length > 0) {
        setAvailability(p.availability);
      }

      // Already approved -> Dashboard
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
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // =========================
  // Logout
  // =========================

  const handleLogout = () => {
    deleteToken();

    navigate("/admin/login", {
      replace: true,
    });
  };

  // =========================
  // Profile Photo Upload
  // =========================

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
        "error"
      );

      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be under 5MB.", "error");

      e.target.value = "";
      return;
    }

    // Local preview
    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreview(reader.result);
    };

    reader.readAsDataURL(file);

    // Upload
    setUploadingPhoto(true);

    const formData = new FormData();

    formData.append("photo", file);

    try {
      const res = await httpClient.post(
        "/upload/photo",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const fileUrl = res?.data?.fileUrl;

      if (!fileUrl) {
        throw new Error("Photo upload response did not contain fileUrl.");
      }

      setProfilePhotoUrl(fileUrl);

      showToast("Profile photo uploaded successfully!");
    } catch (err) {
      console.error("Profile photo upload error:", err);

      // Restore previous preview if upload fails
      setPhotoPreview(profilePhotoUrl);

      showToast(
        err?.response?.data?.message ||
          "Failed to upload photo.",
        "error"
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

  // =========================
  // Credential Document Upload
  // =========================

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
        "error"
      );

      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast(
        "Document size must be under 10MB.",
        "error"
      );

      e.target.value = "";
      return;
    }

    const title = (
      newDocTitle ||
      file.name.replace(/\.[^/.]+$/, "")
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
        }
      );

      const fileUrl = res?.data?.fileUrl;

      if (!fileUrl) {
        throw new Error(
          "Document upload response did not contain fileUrl."
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

      showToast(
        "Credential document uploaded successfully!"
      );
    } catch (err) {
      console.error("Document upload error:", err);

      showToast(
        err?.response?.data?.message ||
          "Failed to upload document.",
        "error"
      );
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleRemoveDoc = (index) => {
    setCredentialDocs((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // =========================
  // Add Availability Slot
  // =========================

  const handleAddSlot = () => {
    if (!startTime || !endTime) {
      showToast(
        "Please select both start and end times.",
        "error"
      );

      return;
    }

    if (startTime >= endTime) {
      showToast(
        "Start time must be strictly before end time.",
        "error"
      );

      return;
    }

    const formattedSlot = `${formatTo12Hour(
      startTime
    )} - ${formatTo12Hour(endTime)}`;

    const dayObj = availability.find(
      (item) => item.day === selectedDay
    );

    // Exact duplicate check
    if (dayObj?.slots?.includes(formattedSlot)) {
      showToast(
        "This exact slot is already added for this day.",
        "error"
      );

      return;
    }

    // Overlapping slot check
    if (dayObj?.slots?.length) {
      const hasOverlap = dayObj.slots.some((slot) => {
        const parts = slot.split(" - ");

        if (parts.length !== 2) {
          return false;
        }

        const existingStart24 = convertTo24Hour(parts[0]);
        const existingEnd24 = convertTo24Hour(parts[1]);

        if (!existingStart24 || !existingEnd24) {
          return false;
        }

        return (
          startTime < existingEnd24 &&
          endTime > existingStart24
        );
      });

      if (hasOverlap) {
        showToast(
          "This time overlaps with an existing slot. Please choose a different time.",
          "error"
        );

        return;
      }
    }

    // Add slot to existing day
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
            : item
        )
      );
    } else {
      // Add new day
      setAvailability((prev) => [
        ...prev,
        {
          day: selectedDay,
          slots: [formattedSlot],
        },
      ]);
    }
  };

  // =========================
  // Remove Slot
  // =========================

  const handleRemoveSlot = (day, slotIndex) => {
    setAvailability((prev) =>
      prev
        .map((item) =>
          item.day === day
            ? {
                ...item,
                slots: (item.slots || []).filter(
                  (_, i) => i !== slotIndex
                ),
              }
            : item
        )
        .filter((item) => item.slots?.length > 0)
    );
  };

  // =========================
  // Submit Completed Profile
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Required validation
    if (!bio.trim()) {
      showToast(
        "Please provide a short professional bio.",
        "error"
      );

      return;
    }

    if (!specialization.trim()) {
      showToast(
        "Please enter your fitness specialization.",
        "error"
      );

      return;
    }

    if (!profilePhotoUrl) {
      showToast(
        "Please select and upload a profile photo from your device.",
        "error"
      );

      return;
    }

    if (credentialDocs.length === 0) {
      showToast(
        "Please upload at least one certificate or credential document.",
        "error"
      );

      return;
    }

    const validAvailability = availability.filter(
      (item) => item?.day && item?.slots?.length > 0
    );

    if (validAvailability.length === 0) {
      showToast(
        "Please configure at least one availability day and slot.",
        "error"
      );

      return;
    }

    setSubmitting(true);

    try {
      const res = await httpClient.put(
        "/auth/complete-professional-profile",
        {
          profilePhoto: profilePhotoUrl,
          specialization: specialization.trim(),
          sessionFee: Number(sessionFee) || 50,
          bio: bio.trim(),
          credentialDocs,
          availability: validAvailability,
        }
      );

      const updated = res?.data?.professional;

      if (updated) {
        setUser(updated);

        const status = String(
          updated.professionalStatus || ""
        ).toLowerCase();

        // Profile submitted for admin approval
        if (status === "pending_verification") {
          showToast(
            "Profile submitted successfully. Waiting for admin approval."
          );

          return;
        }

        // If backend already says approved
        if (status === "approved") {
          navigate("/professional/dashboard", {
            replace: true,
          });

          return;
        }
      }

      showToast(
        "Profile application submitted for verification!"
      );
    } catch (err) {
      console.error(
        "Complete professional profile error:",
        err
      );

      showToast(
        err?.response?.data?.message ||
          "Failed to submit profile.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // Loading
  // =========================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  // =========================
  // Pending Verification Card
  // =========================

  const professionalStatus = String(
    user?.professionalStatus || ""
  ).toLowerCase();

  if (professionalStatus === "pending_verification") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center mb-4">
            <IconClock className="w-8 h-8" />
          </div>

          <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Waiting for Admin Approval
          </span>

          <h2 className="text-2xl font-black text-stone-800 mt-4">
            Verification In Progress
          </h2>

          <p className="text-sm text-stone-500 font-medium mt-3 leading-relaxed">
            Your professional profile has been submitted
            successfully and is currently being reviewed by
            the PoseFit Admin team.
          </p>

          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 mt-6 text-left space-y-3">
            <p className="text-sm font-bold text-stone-700">
              What happens next?
            </p>

            <div className="flex gap-2">
              <span className="text-amber-600 font-black">
                1.
              </span>

              <p className="text-xs text-stone-500">
                Admin will review your profile,
                certificates and credentials.
              </p>
            </div>

            <div className="flex gap-2">
              <span className="text-amber-600 font-black">
                2.
              </span>

              <p className="text-xs text-stone-500">
                Once approved, your professional dashboard
                and booking features will become available.
              </p>
            </div>

            <div className="flex gap-2">
              <span className="text-amber-600 font-black">
                3.
              </span>

              <p className="text-xs text-stone-500">
                You will receive an email notification when
                your application is approved or rejected.
              </p>
            </div>
          </div>

          <div className="mt-5 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-xs font-bold text-amber-800">
              ⏳ Your account is currently awaiting approval.
            </p>

            <p className="text-[11px] text-amber-700 mt-1">
              Dashboard access will be unlocked after admin
              approval.
            </p>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={fetchProfile}
              className="flex-1 py-3 rounded-2xl border border-stone-200 text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 transition-colors"
            >
              Refresh Status
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 py-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <IconLogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // Rejected State
  // =========================

  const isRejected =
    professionalStatus === "rejected";

  // =========================
  // Main Profile Form
  // =========================

  return (
    <div className="min-h-screen py-10 px-4 bg-stone-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border transition-all ${
            toast.type === "error"
              ? "bg-rose-500 border-rose-600"
              : "bg-emerald-600 border-emerald-700"
          }`}
          style={{
            animation: "modalIn 0.2s ease",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              P
            </div>

            <div>
              <p className="font-black text-lg tracking-tight leading-none text-stone-800">
                PoseFit
              </p>

              <p className="text-xs font-bold mt-0.5 text-emerald-600">
                Professional Onboarding
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            <IconLogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

        {/* Rejection Alert */}
        {isRejected && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 mb-6 shadow-sm">
            <p className="text-xs font-extrabold text-rose-900 flex items-center gap-2">
              <IconAlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Application Requires Updates
            </p>

            <p className="text-xs text-rose-800 font-semibold bg-white p-3 rounded-2xl border border-rose-200 mt-2">
              <span className="font-extrabold">
                Admin Feedback:
              </span>{" "}
              {user?.rejectionReason ||
                "Please update your credentials or bio."}
            </p>
          </div>
        )}

        {/* Onboarding Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-8"
        >
          {/* Form Header */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Step 1 of 1
            </span>

            <h1 className="text-2xl font-black text-stone-900 tracking-tight mt-2">
              Complete Your Professional Profile
            </h1>

            <p className="text-xs text-stone-500 font-medium mt-1">
              Please complete your details, upload your
              credentials, and configure your weekly
              availability schedule.
            </p>
          </div>

          {/* Profile Photo */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <label className="block text-xs font-extrabold text-stone-700 uppercase tracking-wider">
              Profile Photo{" "}
              <span className="text-rose-500">*</span>
            </label>

            <div className="flex items-center gap-5">
              {photoPreview ? (
                <div className="relative w-24 h-24 rounded-3xl overflow-hidden border border-stone-200 shadow-sm">
                  <img
                    src={photoPreview}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />

                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-xs font-bold text-center p-2">
                  No Image Selected
                </div>
              )}

              <div className="space-y-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
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
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-stone-400 font-medium">
                  PNG, JPG, WEBP up to 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Role & Specialization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Professional Type */}
            <div>
              <label className="block text-xs font-extrabold text-stone-700 uppercase tracking-wider mb-1.5">
                Professional Role (Admin Set)
              </label>

              <div className="px-4 py-3 rounded-2xl bg-stone-100 border border-stone-200 text-sm font-bold text-stone-700 flex items-center justify-between">
                <span>
                  {user?.professionalType || "Trainer"}
                </span>

                <span className="text-[10px] font-extrabold uppercase bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
                  Locked
                </span>
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-xs font-extrabold text-stone-700 uppercase tracking-wider mb-1.5">
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
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800"
              />
            </div>
          </div>

          {/* Session Fee & Bio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Session Fee */}
            <div>
              <label className="block text-xs font-extrabold text-stone-700 uppercase tracking-wider mb-1.5">
                Session Fee ($){" "}
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
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800"
              />
            </div>

            {/* Bio */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-extrabold text-stone-700 uppercase tracking-wider mb-1.5">
                Bio / Background Description{" "}
                <span className="text-rose-500">*</span>
              </label>

              <textarea
                rows={3}
                required
                placeholder="Share your coaching philosophy, years of experience, and certifications..."
                value={bio}
                onChange={(e) =>
                  setBio(e.target.value)
                }
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 resize-none"
              />
            </div>
          </div>

          {/* Certificates */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-stone-700 uppercase tracking-wider">
                Certificates & Credentials{" "}
                <span className="text-rose-500">*</span>
              </label>

              <span className="text-xs text-stone-400 font-medium">
                Private for Admin verification
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Certificate Title (e.g. ACE Certified)"
                value={newDocTitle}
                onChange={(e) =>
                  setNewDocTitle(e.target.value)
                }
                className="px-4 py-2.5 rounded-2xl border border-stone-200 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-300 text-stone-800 flex-1 min-w-[200px]"
              />

              <label
                className={`cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all shrink-0 ${
                  uploadingDoc
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
                style={{
                  background:
                    "linear-gradient(135deg, #10b981, #059669)",
                }}
              >
                <IconPlus className="w-3.5 h-3.5" />

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

            {/* Documents List */}
            {credentialDocs.length > 0 && (
              <div className="space-y-2 pt-2">
                {credentialDocs.map((doc, idx) => (
                  <div
                    key={`${doc.fileUrl || doc.fileName || "doc"}-${idx}`}
                    className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                        ✓
                      </div>

                      <div>
                        <p className="text-xs font-bold text-stone-800">
                          {doc.title ||
                            "Certificate Document"}
                        </p>

                        <p className="text-[10px] text-stone-400">
                          {doc.fileName ||
                            "Uploaded Document"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveDoc(idx)
                      }
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <label className="block text-xs font-extrabold text-stone-700 uppercase tracking-wider">
              Availability Schedule (12-Hour AM/PM)
            </label>

            {/* Add Slot */}
            <div className="flex items-center gap-2.5 flex-wrap bg-stone-50 p-4 rounded-2xl border border-stone-200">
              {/* Day */}
              <div className="w-36">
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Day
                </label>

                <select
                  value={selectedDay}
                  onChange={(e) =>
                    setSelectedDay(e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 outline-none"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Start Time
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) =>
                    setStartTime(e.target.value)
                  }
                  className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 outline-none"
                />
              </div>

              {/* End */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  End Time
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) =>
                    setEndTime(e.target.value)
                  }
                  className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 outline-none"
                />
              </div>

              {/* Add */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-extrabold hover:bg-emerald-200 transition-colors"
                >
                  + Add Slot
                </button>
              </div>
            </div>

            {/* Active Days */}
            <div className="space-y-2">
              {availability.map((item) => (
                <div
                  key={item.day}
                  className="p-3 bg-white rounded-2xl border border-stone-200 flex items-center justify-between flex-wrap gap-2"
                >
                  <span className="text-xs font-black text-stone-800 w-24">
                    {item.day}
                  </span>

                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {(item.slots || []).map(
                      (slot, sIdx) => (
                        <span
                          key={`${slot}-${sIdx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 text-stone-800 border border-stone-200 text-[11px] font-bold"
                        >
                          <IconClock className="w-3 h-3 text-stone-400" />

                          {slot}

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveSlot(
                                item.day,
                                sIdx
                              )
                            }
                            className="text-stone-400 hover:text-rose-600"
                          >
                            ✕
                          </button>
                        </span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || uploadingPhoto || uploadingDoc}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm shadow-md hover:opacity-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              {submitting
                ? "Submitting Application..."
                : "Submit Profile for Admin Verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
