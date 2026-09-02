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
        file.type
      )
    ) {
      showToast(
        "Please select a valid image file (PNG, JPG, WEBP).",
        "error"
      );
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
        "error"
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
      showToast(
        "Please select a valid document (PDF, PNG, JPG).",
        "error"
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Document size must be under 10MB.", "error");
      return;
    }

    const title = (
      newDocTitle || file.name.replace(/\.[^/.]+$/, "")
    ).trim();

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
        "error"
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
      const res = await httpClient.post(
        "/payment/stripe-connect/onboard"
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Failed to initiate Stripe Connect setup.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setActionLoading(true);

    try {
      const res = await httpClient.post(
        "/payment/stripe-connect/dashboard-link"
      );

      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Failed to open Stripe Dashboard.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);

    try {
      const res = await httpClient.put(
        "/professional/profile",
        form
      );

      showToast("Profile details updated successfully!");

      if (res.data?.professional) {
        setProfile(res.data.professional);
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Failed to update profile.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfessionalLayout>
      <div
        className="min-h-screen pb-16"
        style={{ background: "#f5f7f2" }}
      >
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border ${
              toast.type === "error"
                ? "bg-rose-500 border-rose-600"
                : "bg-emerald-600 border-emerald-700"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Page Header */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-6">
          <span className="inline-flex items-center text-xs font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Account Management
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-stone-800 tracking-tight mt-3">
            Profile Settings
          </h1>

          <p className="text-stone-500 font-medium text-sm mt-1 max-w-2xl">
            Manage your professional profile, credentials, session
            pricing, and payment connection.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-4 sm:px-6 lg:px-8 max-w-5xl space-y-5">
            {/* Profile Overview */}
            <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-black text-emerald-700">
                          {profile?.firstName?.[0]?.toUpperCase() || "P"}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-stone-800 truncate">
                          {profile?.firstName} {profile?.lastName}
                        </h2>

                        <StatusBadge
                          status={
                            profile?.professionalStatus || "invited"
                          }
                        />
                      </div>

                      <p className="text-xs text-stone-500 font-medium mt-1 truncate">
                        {profile?.email}
                      </p>

                      <p className="text-xs text-stone-400 font-medium mt-1">
                        {profile?.professionalType || "Professional"}
                      </p>
                    </div>
                  </div>

                  <div className="lg:w-[360px] rounded-2xl bg-stone-50 border border-stone-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                          <IconBuilding className="w-4 h-4" />
                        </div>

                        <div>
                          <p className="text-xs font-extrabold text-stone-800">
                            Payment Account
                          </p>

                          <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                            {profile?.payoutsEnabled
                              ? "Ready to receive payouts"
                              : "Connect to receive payouts"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border whitespace-nowrap ${
                          profile?.payoutsEnabled
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
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
                          className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-sky-800 bg-white hover:bg-sky-50 border border-sky-200 transition-colors"
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
                          className="w-full px-4 py-2.5 rounded-xl font-bold text-white text-xs shadow-sm hover:opacity-90 transition-all"
                          style={{
                            background:
                              "linear-gradient(135deg, #10b981, #059669)",
                          }}
                        >
                          {actionLoading
                            ? "Connecting..."
                            : "Connect Stripe Account"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {profile?.professionalStatus === "rejected" && (
                  <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <IconAlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />

                    <div>
                      <p className="text-xs font-extrabold text-rose-900">
                        Previous Rejection Reason
                      </p>

                      <p className="text-xs text-rose-800 font-medium mt-1">
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
              className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-7 py-5 border-b border-stone-100">
                <h2 className="text-lg font-black text-stone-800">
                  Professional Information
                </h2>

                <p className="text-xs text-stone-400 font-medium mt-1">
                  Keep your public professional profile accurate and
                  up to date.
                </p>
              </div>

              <div className="p-7 space-y-7">
                {/* Photo */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
                        Profile Photo
                      </h3>

                      <p className="text-[11px] text-stone-400 mt-1">
                        Use a clear professional photo.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-sm shrink-0">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">
                          No Photo
                        </div>
                      )}

                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-2">
                        <label className="cursor-pointer inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                          {photoPreview
                            ? "Change Photo"
                            : "Upload Photo"}

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
                            className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-stone-400 font-medium mt-2">
                        PNG, JPG or WEBP · Maximum 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Basic Details */}
                <div className="border-t border-stone-100 pt-6">
                  <div className="mb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
                      Basic Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
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
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
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
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div className="border-t border-stone-100 pt-6">
                  <div className="mb-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
                      Professional Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                        Professional Role
                      </label>

                      <div className="px-4 py-3 rounded-xl bg-stone-100 border border-stone-200 text-sm font-bold text-stone-700 flex items-center justify-between">
                        <span>
                          {profile?.professionalType || "Trainer"}
                        </span>

                        <span className="text-[9px] font-extrabold uppercase bg-stone-200 text-stone-600 px-2 py-1 rounded-full">
                          Admin Set
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
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
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
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
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
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
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 resize-none transition-all"
                    />
                  </div>
                </div>

                {/* Credentials */}
                <div className="border-t border-stone-100 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
                        Certificates & Credentials
                      </h3>

                      <p className="text-[11px] text-stone-400 mt-1">
                        Upload certificates that support your professional
                        qualifications.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Certificate title e.g. NASM CPT"
                        value={newDocTitle}
                        onChange={(e) =>
                          setNewDocTitle(e.target.value)
                        }
                        className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-medium outline-none text-stone-800 focus:ring-2 focus:ring-emerald-300"
                      />

                      <label
                        className={`cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 hover:bg-emerald-200 transition-colors ${
                          uploadingDoc
                            ? "opacity-60 pointer-events-none"
                            : ""
                        }`}
                      >
                        <IconPlus className="w-3.5 h-3.5" />

                        <span>
                          {uploadingDoc
                            ? "Uploading..."
                            : "Upload Certificate"}
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
                      <div className="text-center py-7">
                        <p className="text-xs font-semibold text-stone-400">
                          No certificates uploaded yet.
                        </p>

                        <p className="text-[10px] text-stone-400 mt-1">
                          PDF, PNG, JPG or WEBP · Maximum 10MB
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {form.credentialDocs.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-stone-200"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <IconCheckCircle className="w-4 h-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-bold text-stone-800 truncate">
                                  {doc.title}
                                </p>

                                <p className="text-[10px] text-stone-400 truncate mt-0.5">
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
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              title="Remove certificate"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save */}
                <div className="border-t border-stone-100 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-[11px] text-stone-400 font-medium">
                    Changes will be saved to your professional profile.
                  </p>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-white text-sm shadow-sm hover:opacity-90 disabled:opacity-60 transition-all"
                    style={{
                      background:
                        "linear-gradient(135deg, #10b981, #059669)",
                    }}
                  >
                    <IconSave className="w-4 h-4" />

                    <span>
                      {saving
                        ? "Saving Changes..."
                        : "Save Profile Details"}
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

