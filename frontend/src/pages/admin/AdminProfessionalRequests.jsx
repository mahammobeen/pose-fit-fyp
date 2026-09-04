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

  // Status update modal
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

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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
          : "Professional application rejected.",
      );

      setStatusOpen(false);

      if (detailOpen) {
        setDetailOpen(false);
      }

      fetchRequests();
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to update status.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen pb-16 bg-transparent font-sans">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-btn shadow-card-hover text-white text-sm font-bold border transition-all ${
              toast.type === "error"
                ? "bg-rose-500 border-rose-600"
                : "bg-brand-dark border-brand-dark"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-5">
          <div className="rounded-card border border-brand-light/60 bg-surface/75 backdrop-blur-xl shadow-card p-6 sm:p-7">
            <span className="inline-flex text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-accent-orange/60 text-[#a95f22] border border-accent-orange">
              Final Verification Stage
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight mt-3">
              Pending Applications Review
            </h1>

            <p className="text-gray-500 font-medium text-sm mt-1">
              Review submitted profile details, credential documents,
              availability, and Stripe Connect status to Approve or Reject.
            </p>
          </div>
        </div>

        {/* Count Badge */}
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <div className="inline-flex items-center gap-3 bg-accent-orange/25 border border-accent-orange/70 rounded-card px-4 py-2.5 shadow-card">
            <span className="w-8 h-8 rounded-xl bg-accent-orange text-[#a95f22] font-black text-sm flex items-center justify-center">
              {requests.length}
            </span>

            <span className="text-[#8f541f] text-sm font-bold">
              Applications Awaiting Final Decision
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-brand-light border-t-brand rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          /* Empty */
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="rounded-card border border-brand-light/60 bg-surface/80 shadow-card p-16 text-center backdrop-blur-xl">
              <div className="w-16 h-16 rounded-full bg-brand-light/45 text-brand-dark flex items-center justify-center mx-auto mb-4">
                <IconCheckCircle className="w-8 h-8" />
              </div>

              <p className="text-xl font-extrabold text-gray-800 mb-1">
                Queue Cleared!
              </p>

              <p className="text-gray-400 font-medium text-sm">
                No pending professional verification applications at this time.
              </p>
            </div>
          </div>
        ) : (
          /* Requests */
          <div className="px-4 sm:px-6 lg:px-8 grid gap-5">
            {requests.map((pro) => (
              <div
                key={pro._id}
                className="rounded-card border border-brand-light/50 bg-surface/80 shadow-card p-6 hover:shadow-card-hover hover:-translate-y-0.5 transition-all backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left */}
                  <div className="flex items-start gap-4">
                    {pro.profilePhoto ? (
                      <img
                        src={pro.profilePhoto}
                        alt={pro.firstName}
                        className="w-14 h-14 rounded-card object-cover border border-brand-light/60 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-card flex items-center justify-center text-white font-black text-xl shrink-0 bg-brand">
                        {pro.firstName?.[0]?.toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-gray-800 text-lg leading-tight">
                          {pro.firstName} {pro.lastName}
                        </p>

                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-light/20 text-brand-dark border border-brand-light/60">
                          {pro.professionalType || "Trainer"}
                        </span>
                      </div>

                      <p className="text-gray-500 text-sm font-medium mt-0.5">
                        {pro.email}
                      </p>

                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs font-semibold text-gray-600">
                        <span>
                          Fee: $
                          {pro.sessionFee
                            ? Number(pro.sessionFee).toFixed(2)
                            : "0.00"}
                        </span>

                        <span>•</span>

                        <span>Spec: {pro.specialization || "General"}</span>

                        <span>•</span>

                        <StatusBadge
                          status={
                            pro.professionalStatus || "pending_verification"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openDetailModal(pro)}
                      className="px-3.5 py-2 rounded-btn text-xs font-bold text-gray-700 bg-white/70 hover:bg-brand-light/20 border border-gray-200 transition-colors"
                    >
                      🔍 Review Full Application
                    </button>

                    <button
                      onClick={() => openStatus(pro, "approved")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-btn text-xs font-bold text-brand-dark bg-brand-light/35 hover:bg-brand-light/55 border border-brand-light transition-colors"
                    >
                      <IconCheck className="w-3.5 h-3.5" />
                      <span>Approve (Make Live)</span>
                    </button>

                    <button
                      onClick={() => openStatus(pro, "rejected")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-btn text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      <IconX className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {/* Previous Rejection Reason */}
                {pro.rejectionReason && (
                  <div className="mt-3 p-3 bg-rose-50 rounded-btn border border-rose-200 text-xs text-rose-800 font-medium">
                    <span className="font-bold">
                      Previous Rejection Reason:
                    </span>{" "}
                    {pro.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* FULL APPLICATION REVIEW MODAL */}

        <Modal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Application Review & Decision"
          maxWidth="max-w-2xl"
        >
          {detailPro && (
            <div className="space-y-6 text-sm">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 bg-brand-light/15 rounded-card border border-brand-light/50">
                {detailPro.profilePhoto ? (
                  <img
                    src={detailPro.profilePhoto}
                    alt={detailPro.firstName}
                    className="w-16 h-16 rounded-card object-cover border border-brand-light/60"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-card bg-brand text-white font-black text-2xl flex items-center justify-center">
                    {detailPro.firstName?.[0]}
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-black text-gray-800">
                    {detailPro.firstName} {detailPro.lastName}
                  </h2>

                  <p className="text-xs text-gray-500 font-semibold">
                    {detailPro.email}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-light/20 text-brand-dark border border-brand-light/50">
                      {detailPro.professionalType || "Trainer"}
                    </span>

                    <StatusBadge
                      status={
                        detailPro.professionalStatus || "pending_verification"
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Specialization & Fee */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-light/10 p-4 rounded-card border border-brand-light/50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Specialization
                  </p>

                  <p className="font-bold text-gray-800">
                    {detailPro.specialization || "Not specified"}
                  </p>
                </div>

                <div className="bg-brand-light/10 p-4 rounded-card border border-brand-light/50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Session Fee
                  </p>

                  <p className="font-extrabold text-brand-dark text-base">
                    $
                    {detailPro.sessionFee
                      ? Number(detailPro.sessionFee).toFixed(2)
                      : "0.00"}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {detailPro.bio && (
                <div className="bg-brand-light/10 p-4 rounded-card border border-brand-light/50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Bio / Profile Description
                  </p>

                  <p className="text-gray-700 font-medium text-xs leading-relaxed">
                    {detailPro.bio}
                  </p>
                </div>
              )}

              {/* Credential Documents */}
              <div className="bg-brand-light/10 p-4 rounded-card border border-brand-light/50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Submitted Certificates & Credential Documents
                </p>

                {detailPro.credentialDocs &&
                detailPro.credentialDocs.length > 0 ? (
                  <div className="space-y-2">
                    {detailPro.credentialDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-white/70 rounded-btn border border-gray-200 text-xs"
                      >
                        <span className="font-bold text-gray-800">
                          {doc.title || `Certificate ${idx + 1}`}
                        </span>

                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-dark font-bold hover:underline flex items-center gap-1"
                          >
                            <IconLink className="w-3.5 h-3.5" />
                            View Document
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-medium">
                    No credential documents uploaded.
                  </p>
                )}
              </div>

              {/* Availability */}
              <div className="bg-brand-light/10 p-4 rounded-card border border-brand-light/50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Submitted Availability Schedule
                </p>

                {detailPro.availability && detailPro.availability.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {detailPro.availability.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white/70 rounded-btn border border-gray-200"
                      >
                        <p className="font-bold text-gray-800">{item.day}</p>

                        <p className="text-gray-500 font-medium text-[11px] mt-0.5">
                          {item.slots ? item.slots.join(", ") : "No slots"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-medium">
                    No availability schedule submitted.
                  </p>
                )}
              </div>

              {/* Stripe Connect */}
              <div className="bg-accent-orange/20 p-4 rounded-card border border-accent-orange/70">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[#8f541f] uppercase tracking-wider flex items-center gap-1.5">
                    <IconLock className="w-3.5 h-3.5" />
                    Stripe Connect Payout Account (Secured)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-gray-500 font-medium">
                      Stripe Account:
                    </span>{" "}
                    <span className="font-bold text-gray-800">
                      {detailPro.stripeAccountId
                        ? "Connected"
                        : "Not Connected"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-medium">
                      Payout Status:
                    </span>{" "}
                    <span className="font-bold text-gray-800">
                      {detailPro.payoutsEnabled
                        ? "Enabled"
                        : "Disabled / Pending Setup"}
                    </span>
                  </div>

                  {detailPro.maskedBank && (
                    <div>
                      <span className="text-gray-500 font-medium">
                        Bank Account:
                      </span>{" "}
                      <span className="font-bold text-gray-800">
                        {detailPro.maskedBank}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-gray-500 font-medium">
                      Account Status:
                    </span>{" "}
                    <span className="font-bold text-gray-800 capitalize">
                      {detailPro.stripeAccountStatus || "unconnected"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => openStatus(detailPro, "rejected")}
                  className="flex-1 py-2.5 rounded-btn bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition-colors"
                >
                  ✕ Reject Application
                </button>

                <button
                  onClick={() => openStatus(detailPro, "approved")}
                  className="flex-1 py-2.5 rounded-btn bg-gray-800 text-white font-bold text-xs hover:bg-gray-700 shadow-card transition-colors"
                >
                  ✓ Approve & Make Live
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* DECISION MODAL */}

        <Modal
          isOpen={statusOpen}
          onClose={() => setStatusOpen(false)}
          title={
            statusAction === "approved"
              ? "Approve Professional"
              : "Reject Application"
          }
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <div
              className={`p-3.5 rounded-btn text-xs font-bold border ${
                statusAction === "approved"
                  ? "bg-brand-light/30 border-brand-light text-brand-dark"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {statusAction === "approved"
                ? `Approving ${selectedPro?.firstName} ${selectedPro?.lastName}. This professional will become LIVE and BOOKABLE.`
                : `Rejecting ${selectedPro?.firstName} ${selectedPro?.lastName}'s application.`}
            </div>

            {statusAction === "rejected" && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Rejection Reason <span className="text-rose-600">*</span>
                </label>

                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="State clear reason for rejection..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/60 resize-none font-medium"
                />
              </div>
            )}

            <p className="text-xs text-gray-400 font-medium">
              An email update will be sent to the professional automatically.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStatusOpen(false)}
                className="flex-1 py-2.5 rounded-btn border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-btn text-white text-sm font-bold shadow-card disabled:opacity-60 transition-colors ${
                  statusAction === "approved"
                    ? "bg-gray-800 hover:bg-gray-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {actionLoading
                  ? "Processing..."
                  : statusAction === "approved"
                  ? "Approve Live"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
