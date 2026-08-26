import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/admin/Modal";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  IconCheck,
  IconX,
  IconCheckCircle,
  IconLock,
  IconLink,
} from "../../components/admin/Icons";

export default function AdminProfessionalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review full detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPro, setDetailPro] = useState(null);

  // Status update modal (Approve / Reject)
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedPro, setSelectedPro] = useState(null);
  const [statusAction, setStatusAction] = useState("approved");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/admin/professional-requests");
      setRequests(res.data?.professionals || []);
    } catch {
      showToast("Failed to load professional requests", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* ---- OPEN DETAIL MODAL ---- */
  const openDetailModal = (pro) => {
    setDetailPro(pro);
    setDetailOpen(true);
  };

  /* ---- APPROVE / REJECT ---- */
  const openStatus = (pro, action) => {
    setSelectedPro(pro);
    setStatusAction(action);
    setRejectionReasonInput("");
    setStatusOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (statusAction === "rejected" && !rejectionReasonInput.trim()) {
      showToast("Please specify a rejection reason", "error");
      return;
    }
    setActionLoading(true);
    try {
      await httpClient.put(`/admin/professional-status/${selectedPro._id}`, {
        status: statusAction,
        rejectionReason: rejectionReasonInput,
      });
      showToast(
        statusAction === "approved"
          ? "Professional application approved! Account is now LIVE & BOOKABLE."
          : "Professional application rejected."
      );
      setStatusOpen(false);
      if (detailOpen) setDetailOpen(false);
      fetchRequests();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update status.", "error");
    } finally { setActionLoading(false); }
  };

  return (
    <AdminLayout>
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
          <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
            Final Verification Stage
          </span>
          <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">Pending Applications Review</h1>
          <p className="text-stone-500 font-medium text-sm mt-1">
            Review submitted profile details, credential documents, availability, and Stripe Connect status to Approve or Reject.
          </p>
        </div>

        {/* Count badge */}
        <div className="px-8 mb-6">
          <div className="inline-flex items-center gap-3 bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-2.5 shadow-xs">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center">
              {requests.length}
            </span>
            <span className="text-amber-900 text-sm font-bold">Applications Awaiting Final Decision</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="px-8">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                <IconCheckCircle className="w-8 h-8" />
              </div>
              <p className="text-xl font-extrabold text-stone-800 mb-1">Queue Cleared!</p>
              <p className="text-stone-400 font-medium text-sm">No pending professional verification applications at this time.</p>
            </div>
          </div>
        ) : (
          <div className="px-8 grid gap-5">
            {requests.map((pro) => (
              <div key={pro._id} className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: Profile Info */}
                  <div className="flex items-start gap-4">
                    {pro.profilePhoto ? (
                      <img src={pro.profilePhoto} alt={pro.firstName} className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shrink-0" />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                      >
                        {pro.firstName?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-stone-800 text-lg leading-tight">
                          {pro.firstName} {pro.lastName}
                        </p>
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          {pro.professionalType || "Trainer"}
                        </span>
                      </div>
                      <p className="text-stone-500 text-sm font-medium mt-0.5">{pro.email}</p>
                      
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs font-semibold text-stone-600">
                        <span>Fee: ${pro.sessionFee ? Number(pro.sessionFee).toFixed(2) : "0.00"}</span>
                        <span>•</span>
                        <span>Spec: {pro.specialization || "General"}</span>
                        <span>•</span>
                        <StatusBadge status={pro.professionalStatus || "pending_verification"} />
                      </div>
                    </div>
                  </div>

                  {/* Right: Review Decision Actions Only */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openDetailModal(pro)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
                    >
                      🔍 Review Full Application
                    </button>
                    <button
                      onClick={() => openStatus(pro, "approved")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors"
                    >
                      <IconCheck className="w-3.5 h-3.5" />
                      <span>Approve (Make Live)</span>
                    </button>
                    <button
                      onClick={() => openStatus(pro, "rejected")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 transition-colors"
                    >
                      <IconX className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {/* Previous Rejection Reason info */}
                {pro.rejectionReason && (
                  <div className="mt-3 p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 font-medium">
                    <span className="font-bold">Previous Rejection Reason:</span> {pro.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* FULL APPLICATION REVIEW MODAL */}
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Application Review & Decision" maxWidth="max-w-2xl">
          {detailPro && (
            <div className="space-y-6 text-sm">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                {detailPro.profilePhoto ? (
                  <img src={detailPro.profilePhoto} alt={detailPro.firstName} className="w-16 h-16 rounded-2xl object-cover border border-stone-200" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white font-black text-2xl flex items-center justify-center">
                    {detailPro.firstName?.[0]}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-black text-stone-800">{detailPro.firstName} {detailPro.lastName}</h2>
                  <p className="text-xs text-stone-500 font-semibold">{detailPro.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-stone-200 text-stone-800">
                      {detailPro.professionalType || "Trainer"}
                    </span>
                    <StatusBadge status={detailPro.professionalStatus || "pending_verification"} />
                  </div>
                </div>
              </div>

              {/* Specialization & Session Fee */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Specialization</p>
                  <p className="font-bold text-stone-800">{detailPro.specialization || "Not specified"}</p>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Session Fee</p>
                  <p className="font-extrabold text-emerald-700 text-base">${detailPro.sessionFee ? Number(detailPro.sessionFee).toFixed(2) : "0.00"}</p>
                </div>
              </div>

              {/* Bio */}
              {detailPro.bio && (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Bio / Profile Description</p>
                  <p className="text-stone-700 font-medium text-xs leading-relaxed">{detailPro.bio}</p>
                </div>
              )}

              {/* Credential Documents */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Submitted Certificates & Credential Documents</p>
                {detailPro.credentialDocs && detailPro.credentialDocs.length > 0 ? (
                  <div className="space-y-2">
                    {detailPro.credentialDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-stone-200 text-xs">
                        <span className="font-bold text-stone-800">{doc.title || `Certificate ${idx + 1}`}</span>
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-teal-700 font-bold hover:underline flex items-center gap-1">
                            <IconLink className="w-3.5 h-3.5" /> View Document
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 font-medium">No credential documents uploaded.</p>
                )}
              </div>

              {/* Availability Schedule */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Submitted Availability Schedule</p>
                {detailPro.availability && detailPro.availability.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {detailPro.availability.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-stone-200">
                        <p className="font-bold text-stone-800">{item.day}</p>
                        <p className="text-stone-500 font-medium text-[11px] mt-0.5">
                          {item.slots ? item.slots.join(", ") : "No slots"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 font-medium">No availability schedule submitted.</p>
                )}
              </div>

              {/* Stripe Connect Account Status (Secured & Non-sensitive) */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <IconLock className="w-3.5 h-3.5" /> Stripe Connect Payout Account (Secured)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-stone-500 font-medium">Stripe Account:</span>{" "}
                    <span className="font-bold text-stone-800">
                      {detailPro.stripeAccountId ? "Connected" : "Not Connected"}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 font-medium">Payout Status:</span>{" "}
                    <span className="font-bold text-stone-800">
                      {detailPro.payoutsEnabled ? "Enabled" : "Disabled / Pending Setup"}
                    </span>
                  </div>
                  {detailPro.maskedBank && (
                    <div>
                      <span className="text-stone-500 font-medium">Bank Account:</span>{" "}
                      <span className="font-bold text-stone-800">{detailPro.maskedBank}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-stone-500 font-medium">Account Status:</span>{" "}
                    <span className="font-bold text-stone-800 capitalize">
                      {detailPro.stripeAccountStatus || "unconnected"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Decision Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => openStatus(detailPro, "rejected")}
                  className="flex-1 py-2.5 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs hover:bg-rose-200 transition-colors"
                >
                  ✕ Reject Application
                </button>
                <button
                  onClick={() => openStatus(detailPro, "approved")}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  ✓ Approve & Make Live
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* DECISION MODAL (APPROVE / REJECT ONLY) */}
        <Modal
          isOpen={statusOpen}
          onClose={() => setStatusOpen(false)}
          title={statusAction === "approved" ? "Approve Professional" : "Reject Application"}
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <div className={`p-3.5 rounded-2xl text-xs font-bold border ${statusAction === "approved" ? "bg-teal-50 border-teal-200 text-teal-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
              {statusAction === "approved"
                ? `Approving ${selectedPro?.firstName} ${selectedPro?.lastName}. This professional will become LIVE and BOOKABLE.`
                : `Rejecting ${selectedPro?.firstName} ${selectedPro?.lastName}'s application.`}
            </div>

            {statusAction === "rejected" && (
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                  Rejection Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="State clear reason for rejection..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 resize-none font-medium text-stone-800"
                />
              </div>
            )}

            <p className="text-xs text-stone-400 font-medium">An email update will be sent to the professional automatically.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setStatusOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-xs disabled:opacity-60 transition-colors ${
                  statusAction === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {actionLoading ? "Processing..." : statusAction === "approved" ? "Approve Live" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
