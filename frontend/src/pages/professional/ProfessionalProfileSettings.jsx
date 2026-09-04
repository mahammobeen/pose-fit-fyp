import { useState, useEffect, useCallback } from "react";

import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";

import {
  IconSave,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconCheckCircle,
  IconBuilding,
} from "../../components/admin/Icons";

export default function ProfessionalProfileSettings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    specialization: "",
    sessionFee: "",
    bio: "",
    profilePhoto: "",
    credentialDocs: [],
  });

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      const res = await httpClient.get("/professional/profile");
      const p = res.data?.professional;

      setProfile(p);

      if (p) {
        setForm({
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          specialization: p.specialization || "",
          sessionFee: p.sessionFee !== undefined ? p.sessionFee : "",
          bio: p.bio || "",
          profilePhoto: p.profilePhoto || "",
          credentialDocs: p.credentialDocs || [],
        });

        if (p.profilePhoto) {
          setPhotoPreview(p.profilePhoto);
        }
      }
    } catch {
      showToast("Failed to load profile details", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const params = new URLSearchParams(window.location.search);

    if (params.get("stripe") === "return") {
      httpClient
        .get("/payment/stripe-connect/status")
        .then(() => {
          showToast("Stripe Connect account status refreshed successfully!");
          fetchProfile();
        })
        .catch(() => {});
    }
  }, [fetchProfile]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.type,
      )
    ) {
      showToast("Please select a valid image file (PNG, JPG, WEBP).", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be under 5MB.", "error");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);

    setUploadingPhoto(true);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await httpClient.post("/upload/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setForm((p) => ({
        ...p,
        profilePhoto: res.data.fileUrl,
      }));

      showToast("Profile photo uploaded from device!");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to upload photo.",
        "error",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview("");

    setForm((p) => ({
      ...p,
      profilePhoto: "",
    }));
  };

  const handleDocSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      showToast("Please select a valid document (PDF, PNG, JPG).", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Document size must be under 10MB.", "error");
      return;
    }

    const title = (newDocTitle || file.name.replace(/\.[^/.]+$/, "")).trim();

    setUploadingDoc(true);

    const formData = new FormData();
    formData.append("document", file);

    try {
      const res = await httpClient.post("/upload/document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setForm((prev) => ({
        ...prev,
        credentialDocs: [
          ...prev.credentialDocs,
          {
            title: title || "Certificate",
            fileUrl: res.data.fileUrl,
            fileName: res.data.originalName || file.name,
            uploadedAt: new Date(),
          },
        ],
      }));

      setNewDocTitle("");
      showToast("Certificate document uploaded from device!");
    } catch (err) {
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
    setForm((prev) => ({
      ...prev,
      credentialDocs: prev.credentialDocs.filter((_, i) => i !== index),
    }));
  };

  const handleConnectStripe = async () => {
    setActionLoading(true);

    try {
      const res = await httpClient.post("/payment/stripe-connect/onboard");

      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Failed to initiate Stripe Connect setup.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setActionLoading(true);

    try {
      const res = await httpClient.post(
        "/payment/stripe-connect/dashboard-link",
      );

      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to open Stripe Dashboard.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await httpClient.put("/professional/profile", form);

      showToast("Profile details updated successfully!");

      if (res.data?.professional) {
        setProfile(res.data.professional);
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to update profile.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfessionalLayout>
      <div className="min-h-screen bg-transparent pb-16 font-sans">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed right-5 top-5 z-50 rounded-card border px-5 py-3 text-sm font-bold text-white shadow-card-hover ${
              toast.type === "error"
                ? "border-rose-600 bg-rose-600"
                : "border-brand-dark bg-brand-dark"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Page Header */}
        <div className="px-4 pb-6 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <span className="inline-flex items-center rounded-full border border-brand-light bg-brand-light/40 px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
            Account Management
          </span>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
            Profile Settings
          </h1>

          <p className="mt-1 max-w-2xl text-sm font-medium text-gray-500">
            Manage your professional profile, credentials, session pricing, and
            payment connection.
          </p>
        </div>

        {loading ? (
          <div className="flex h-52 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand-dark" />
          </div>
        ) : (
          <div className="max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
            {/* Profile Overview */}
            <section className="overflow-hidden rounded-card border border-brand-light/60 bg-surface/90 shadow-card">
              <div className="p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-card border border-brand-light bg-brand-light/40">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-black text-brand-dark">
                          {profile?.firstName?.[0]?.toUpperCase() || "P"}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-xl font-extrabold tracking-tight text-gray-800">
                          {profile?.firstName} {profile?.lastName}
                        </h2>

                        <StatusBadge
                          status={profile?.professionalStatus || "invited"}
                        />
                      </div>

                      <p className="mt-1 truncate text-xs font-medium text-gray-500">
                        {profile?.email}
                      </p>

                      <p className="mt-1 text-xs font-medium text-gray-400">
                        {profile?.professionalType || "Professional"}
                      </p>
                    </div>
                  </div>

                  {/* Payment Account */}
                  <div className="rounded-card border border-brand-light/50 bg-brand-light/10 p-4 lg:w-[360px]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-light bg-brand-light/40 text-brand-dark">
                          <IconBuilding className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-xs font-extrabold text-gray-800">
                            Payment Account
                          </p>

                          <p className="mt-0.5 text-[11px] font-medium text-gray-400">
                            {profile?.payoutsEnabled
                              ? "Ready to receive payouts"
                              : "Connect to receive payouts"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                          profile?.payoutsEnabled
                            ? "border-brand-light bg-brand-light/40 text-brand-dark"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {profile?.payoutsEnabled
                          ? "Connected"
                          : "Setup Required"}
                      </span>
                    </div>

                    <div className="mt-3">
                      {profile?.payoutsEnabled ? (
                        <button
                          type="button"
                          onClick={handleOpenStripeDashboard}
                          disabled={actionLoading}
                          className="w-full rounded-btn border border-sky-200 bg-white px-4 py-2.5 text-xs font-bold text-sky-800 transition-all hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading
                            ? "Opening..."
                            : "View / Manage Stripe"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectStripe}
                          disabled={actionLoading}
                          className="w-full rounded-btn bg-gray-800 px-4 py-2.5 text-xs font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoading
                            ? "Connecting..."
                            : "Connect Stripe Account"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {profile?.professionalStatus === "rejected" && (
                  <div className="mt-5 flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 p-4">
                    <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

                    <div>
                      <p className="text-xs font-extrabold text-rose-900">
                        Previous Rejection Reason
                      </p>

                      <p className="mt-1 text-xs font-medium text-rose-800">
                        {profile.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Main Profile Form */}
            <form
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-card border border-brand-light/60 bg-surface/90 shadow-card"
            >
              {/* Section Header */}
              <div className="border-b border-brand-light/40 px-7 py-5">
                <h2 className="text-lg font-extrabold tracking-tight text-gray-800">
                  Professional Information
                </h2>

                <p className="mt-1 text-xs font-medium text-gray-400">
                  Keep your public professional profile accurate and up to date.
                </p>
              </div>

              <div className="space-y-7 p-7">
                {/* Profile Photo */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
                        Profile Photo
                      </h3>

                      <p className="mt-1 text-[11px] text-gray-400">
                        Use a clear professional photo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-card border border-brand-light/50 bg-brand-light/10 p-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card border border-brand-light bg-white shadow-card">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Profile Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-400">
                          No Photo
                        </div>
                      )}

                      {uploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-btn border border-brand-light bg-brand-light/40 px-4 py-2 text-xs font-bold text-brand-dark transition-colors hover:bg-brand-light/60">
                          {photoPreview ? "Change Photo" : "Upload Photo"}

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                        </label>

                        {photoPreview && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="rounded-btn border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <p className="mt-2 text-[10px] font-medium text-gray-400">
                        PNG, JPG or WEBP · Maximum 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Basic Details */}
                <div className="border-t border-brand-light/40 pt-6">
                  <div className="mb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
                      Basic Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                        First Name
                      </label>

                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            firstName: e.target.value,
                          }))
                        }
                        className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                        Last Name
                      </label>

                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            lastName: e.target.value,
                          }))
                        }
                        className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div className="border-t border-brand-light/40 pt-6">
                  <div className="mb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
                      Professional Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                        Professional Role
                      </label>

                      <div className="flex items-center justify-between rounded-btn border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700">
                        <span>{profile?.professionalType || "Trainer"}</span>

                        <span className="rounded-full bg-gray-200 px-2 py-1 text-[9px] font-extrabold uppercase text-gray-600">
                          Admin Set
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                        Session Fee ($)
                      </label>

                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 50"
                        value={form.sessionFee}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            sessionFee: e.target.value,
                          }))
                        }
                        className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                      Specialization
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. HIIT, Strength & Weight Loss"
                      value={form.specialization}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          specialization: e.target.value,
                        }))
                      }
                      className="w-full rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                      Bio / Professional Overview
                    </label>

                    <textarea
                      rows={4}
                      placeholder="Describe your background, fitness philosophy, and certifications..."
                      value={form.bio}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          bio: e.target.value,
                        }))
                      }
                      className="w-full resize-none rounded-btn border border-gray-200 bg-white/70 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                    />
                  </div>
                </div>

                {/* Credentials */}
                <div className="border-t border-brand-light/40 pt-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
                        Certificates & Credentials
                      </h3>

                      <p className="mt-1 text-[11px] text-gray-400">
                        Upload certificates that support your professional
                        qualifications.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-card border border-brand-light/50 bg-brand-light/10 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        placeholder="Certificate title e.g. NASM CPT"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        className="flex-1 rounded-btn border border-gray-200 bg-white/80 px-4 py-2.5 text-xs font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                      />

                      <label
                        className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-btn border border-brand-light bg-brand-light/40 px-4 py-2.5 text-xs font-bold text-brand-dark transition-colors hover:bg-brand-light/60 ${
                          uploadingDoc ? "pointer-events-none opacity-60" : ""
                        }`}
                      >
                        <IconPlus className="h-3.5 w-3.5" />

                        <span>
                          {uploadingDoc ? "Uploading..." : "Upload Certificate"}
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

                    {form.credentialDocs.length === 0 ? (
                      <div className="py-7 text-center">
                        <p className="text-xs font-semibold text-gray-400">
                          No certificates uploaded yet.
                        </p>

                        <p className="mt-1 text-[10px] text-gray-400">
                          PDF, PNG, JPG or WEBP · Maximum 10MB
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {form.credentialDocs.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 rounded-btn border border-brand-light/40 bg-white/80 p-3 transition-colors hover:bg-brand-light/10"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-light bg-brand-light/40 text-brand-dark">
                                <IconCheckCircle className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-gray-800">
                                  {doc.title}
                                </p>

                                <p className="mt-0.5 truncate text-[10px] text-gray-400">
                                  {doc.fileName || "Uploaded Document"}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(idx)}
                              className="shrink-0 rounded-xl p-2 text-rose-700 transition-colors hover:bg-rose-50"
                              title="Remove certificate"
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save */}
                <div className="flex flex-col gap-4 border-t border-brand-light/40 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-medium text-gray-400">
                    Changes will be saved to your professional profile.
                  </p>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-btn bg-gray-800 px-7 py-3 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <IconSave className="h-4 w-4" />

                    <span>
                      {saving ? "Saving Changes..." : "Save Profile Details"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </ProfessionalLayout>
  );
}
