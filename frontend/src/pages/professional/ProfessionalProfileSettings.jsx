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

  // Device Photo Upload Handler
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
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
      setForm((p) => ({ ...p, profilePhoto: res.data.fileUrl }));
      showToast("Profile photo uploaded from device!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to upload photo.", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview("");
    setForm((p) => ({ ...p, profilePhoto: "" }));
  };

  // Device Document Upload Handler
  const handleDocSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
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
      showToast(err?.response?.data?.message || "Failed to upload document.", "error");
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

  // Stripe Account Connect
  const handleConnectStripe = async () => {
    setActionLoading(true);
    try {
      const res = await httpClient.post("/payment/stripe-connect/onboard");
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to initiate Stripe Connect setup.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setActionLoading(true);
    try {
      const res = await httpClient.post("/payment/stripe-connect/dashboard-link");
      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to open Stripe Dashboard.", "error");
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
      showToast(err?.response?.data?.message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfessionalLayout>
      <div className="min-h-screen pb-16" style={{ background: "#f5f7f2" }}>
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border transition-all ${
              toast.type === "error" ? "bg-rose-500 border-rose-600" : "bg-emerald-600 border-emerald-700"
            }`}
            style={{ animation: "modalIn 0.2s ease" }}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Account Management
          </span>
          <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">Profile Settings</h1>
          <p className="text-stone-500 font-medium text-sm mt-1">
            Update your professional information, bio, certificates, and payout connection.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-8 max-w-4xl space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Verification Status</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-lg font-black text-stone-800">
                    {profile?.firstName} {profile?.lastName}
                  </p>
                  <StatusBadge status={profile?.professionalStatus || "invited"} />
                </div>
                <p className="text-xs text-stone-500 font-medium mt-1">Email: {profile?.email}</p>
              </div>

              {profile?.professionalStatus === "rejected" && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl max-w-md">
                  <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <IconAlertTriangle className="w-4 h-4 text-rose-600" /> Previous Rejection Reason
                  </p>
                  <p className="text-xs text-rose-800 font-medium mt-1">{profile.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Stripe Account Connection Card */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                  <IconBuilding className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-extrabold text-stone-800 text-sm flex items-center gap-2">
                    Payment Account
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${profile?.payoutsEnabled ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                      {profile?.payoutsEnabled ? "Stripe Account Connected ✓" : "Not Connected"}
                    </span>
                  </p>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    {profile?.payoutsEnabled
                      ? `Connected to Stripe Express ${profile?.maskedBank ? `(${profile.maskedBank})` : ""}`
                      : "Connect your Stripe account to receive your 80% session payouts."}
                  </p>
                </div>
              </div>

              <div>
                {profile?.payoutsEnabled ? (
                  <button
                    type="button"
                    onClick={handleOpenStripeDashboard}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                  >
                    {actionLoading ? "Opening..." : "View / Manage Connection"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectStripe}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl font-bold text-white text-xs shadow-xs hover:opacity-90 transition-all"
                    style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                  >
                    {actionLoading ? "Connecting..." : "Connect Stripe"}
                  </button>
                )}
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6">
              <h2 className="text-base font-extrabold text-stone-800 border-b border-stone-100 pb-3">
                Basic & Professional Details
              </h2>

              {/* Profile Photo Device Upload */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">Profile Photo</label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-stone-200 shadow-xs">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-xs font-bold text-center p-1">
                      No Photo
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                      <span>{photoPreview ? "Change Photo" : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handlePhotoSelect}
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
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              {/* Professional Role (READ-ONLY) & Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                    Professional Role (Admin Set)
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-stone-100 border border-stone-200 text-sm font-bold text-stone-700 flex items-center justify-between">
                    <span>{profile?.professionalType || "Trainer"}</span>
                    <span className="text-[10px] font-extrabold uppercase bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
                      Read-Only
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Session Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={form.sessionFee}
                    onChange={(e) => setForm((p) => ({ ...p, sessionFee: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. HIIT, Strength & Weight Loss"
                  value={form.specialization}
                  onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Bio / Overview</label>
                <textarea
                  rows={4}
                  placeholder="Describe your background, fitness philosophy, and certifications..."
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                />
              </div>

              {/* Credentials / Documents Device Upload */}
              <div className="pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
                  Certificates & Credentials
                </label>

                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <input
                    type="text"
                    placeholder="Certificate Title (e.g. NASM CPT)"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-medium outline-none text-stone-800 flex-1 min-w-[200px]"
                  />

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                    <IconPlus className="w-3.5 h-3.5" />
                    <span>{uploadingDoc ? "Uploading..." : "Upload Certificate from Device"}</span>
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
                  <p className="text-xs text-stone-400 font-medium">No certificates uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {form.credentialDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">✓</span>
                          <div>
                            <p className="text-xs font-bold text-stone-800">{doc.title}</p>
                            <p className="text-[10px] text-stone-400">{doc.fileName || "Uploaded Document"}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm shadow-xs hover:opacity-90 disabled:opacity-60 transition-all"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  <IconSave className="w-4 h-4" />
                  <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </ProfessionalLayout>
  );
}
