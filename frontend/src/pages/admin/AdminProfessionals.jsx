import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/admin/Modal";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import { Search, Plus, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  professionalType: "Trainer",
  specialization: "",
  sessionFee: "",
};

export default function AdminProfessionals() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPro, setSelectedPro] = useState(null);

  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProfessionals = useCallback(async () => {
    try {
      setLoading(true);

      const res = await httpClient.get("/admin/get-professionals");

      setProfessionals(res.data?.professionals || []);
    } catch {
      showToast("Failed to load professionals", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const filtered = professionals.filter((p) => {
    const q = search.toLowerCase();

    return (
      p.firstName?.toLowerCase().includes(q) ||
      p.lastName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.specialization?.toLowerCase().includes(q) ||
      p.professionalType?.toLowerCase().includes(q)
    );
  });

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!addForm.firstName || !addForm.lastName || !addForm.email) {
      setAddError("First name, last name, and email are required.");
      return;
    }

    setActionLoading(true);
    setAddError("");

    try {
      await httpClient.post("/admin/add-professional", addForm);

      showToast("Professional invitation sent & account created!");

      setAddOpen(false);
      setAddForm(EMPTY_FORM);
      fetchProfessionals();
    } catch (err) {
      setAddError(
        err?.response?.data?.message || "Failed to add professional.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);

    try {
      await httpClient.delete(
        `/admin/delete-professional/${selectedPro._id}`,
      );

      showToast("Professional removed successfully", "error");

      setDeleteOpen(false);
      fetchProfessionals();
    } catch {
      showToast("Failed to delete professional.", "error");
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
          <div className="rounded-card border border-brand-light/60 bg-surface/75 backdrop-blur-xl shadow-card p-6 sm:p-7 flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="inline-flex text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-light/45 text-brand-dark border border-brand-light">
                Professionals Directory
              </span>

              <h1 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight mt-3">
                Professionals
              </h1>

              <p className="text-gray-500 font-medium text-sm mt-1">
                Onboard and manage certified Trainers, Nutritionists, and Stripe
                Payout accounts.
              </p>
            </div>

            <button
              id="add-professional-btn"
              onClick={() => {
                setAddForm(EMPTY_FORM);
                setAddError("");
                setAddOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-btn font-bold text-white text-sm shadow-card hover:-translate-y-0.5 hover:shadow-card-hover active:scale-95 transition-all bg-gray-800 hover:bg-gray-700"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Professional</span>
            </button>
          </div>
        </div>

        {/* Status Counts */}
        <div className="px-4 sm:px-6 lg:px-8 mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "Total Pros",
              value: professionals.length,
              bg: "bg-surface/80",
              border: "border-brand-light/50",
              textColor: "text-gray-800",
            },
            {
              label: "Invited",
              value: professionals.filter(
                (p) =>
                  p.professionalStatus === "invited" ||
                  p.professionalStatus === "INVITED",
              ).length,
              bg: "bg-accent-blue/30",
              border: "border-accent-blue",
              textColor: "text-[#176b9c]",
            },
            {
              label: "Pending Verification",
              value: professionals.filter(
                (p) =>
                  p.professionalStatus === "pending_verification" ||
                  p.professionalStatus === "PENDING_VERIFICATION" ||
                  p.professionalStatus === "PENDING",
              ).length,
              bg: "bg-accent-orange/25",
              border: "border-accent-orange",
              textColor: "text-[#a95f22]",
            },
            {
              label: "Approved & Live",
              value: professionals.filter(
                (p) =>
                  p.professionalStatus === "approved" ||
                  p.professionalStatus === "APPROVED",
              ).length,
              bg: "bg-brand-light/30",
              border: "border-brand-light",
              textColor: "text-brand-dark",
            },
            {
              label: "Stripe Connected",
              value: professionals.filter(
                (p) => p.stripeAccountId && p.payoutsEnabled,
              ).length,
              bg: "bg-accent-blue/25",
              border: "border-accent-blue",
              textColor: "text-[#176b9c]",
            },
          ].map(({ label, value, bg, border, textColor }) => (
            <div
              key={label}
              className={`rounded-card px-4 py-3 border shadow-card flex items-center justify-between backdrop-blur-xl ${bg} ${border}`}
            >
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {label}
              </span>

              <span className={`text-xl font-black ${textColor}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 lg:px-8 mb-4">
          <div className="relative max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4" />
            </span>

            <input
              type="text"
              placeholder="Search by name, email, specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/60 font-medium shadow-card placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="rounded-card shadow-card border border-brand-light/50 overflow-hidden bg-surface/85 backdrop-blur-xl">
            {loading ? (
              <div className="flex items-center justify-center h-52">
                <div className="w-8 h-8 border-4 border-brand-light border-t-brand rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-medium">
                {search
                  ? "No professionals match your search."
                  : "No professionals found."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-light/15 border-b border-brand-light/50">
                      {[
                        "Name",
                        "Email",
                        "Role",
                        "Specialization",
                        "Session Fee",
                        "Status",
                        "Stripe Payouts",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-brand-light/30">
                    {filtered.map((pro) => (
                      <tr
                        key={pro._id}
                        className="hover:bg-brand-light/10 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-btn flex items-center justify-center text-white text-xs font-black shrink-0 bg-brand">
                              {pro.firstName?.[0]?.toUpperCase()}
                            </div>

                            <span className="font-bold text-gray-800 whitespace-nowrap">
                              {pro.firstName} {pro.lastName}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-4 text-gray-600 font-medium">
                          {pro.email}
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-light/20 text-brand-dark border border-brand-light/60">
                            {pro.professionalType || "Trainer"}
                          </span>
                        </td>

                        {/* Specialization */}
                        <td className="px-5 py-4 text-gray-600 font-medium">
                          {pro.specialization || "General"}
                        </td>

                        {/* Fee */}
                        <td className="px-5 py-4 text-gray-800 font-bold">
                          Rs.{" "}
                          {pro.sessionFee
                            ? Number(pro.sessionFee).toLocaleString()
                            : "0"}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={pro.professionalStatus || "invited"}
                          />
                        </td>

                        {/* Stripe */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {pro.stripeAccountId ? (
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  pro.payoutsEnabled
                                    ? "bg-brand-light/35 text-brand-dark border-brand-light"
                                    : "bg-accent-orange/25 text-[#a95f22] border-accent-orange"
                                }`}
                              >
                                {pro.payoutsEnabled
                                  ? "Connected & Enabled"
                                  : "Pending Setup"}
                              </span>

                              {pro.maskedBank && (
                                <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                                  Bank: {pro.maskedBank}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              Not Connected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => {
                              setSelectedPro(pro);
                              setDeleteOpen(true);
                            }}
                            className="flex items-center gap-1 px-3.5 py-1.5 rounded-btn text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3 font-semibold">
            Showing {filtered.length} of {professionals.length} professionals
          </p>
        </div>

        {/* ADD / INVITE MODAL */}
        <Modal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          title="Invite New Professional"
        >
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && (
              <div className="p-3.5 rounded-btn bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {addError}
              </div>
            )}

            {/* First / Last Name */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["firstName", "First Name"],
                ["lastName", "Last Name"],
              ].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                    {l}
                  </label>

                  <input
                    type="text"
                    value={addForm[k]}
                    onChange={(e) =>
                      setAddForm((p) => ({
                        ...p,
                        [k]: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/60 font-medium"
                  />
                </div>
              ))}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>

              <input
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((p) => ({
                    ...p,
                    email: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/60 font-medium"
              />
            </div>

            {/* Role / Fee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Role / Type
                </label>

                <select
                  value={addForm.professionalType}
                  onChange={(e) =>
                    setAddForm((p) => ({
                      ...p,
                      professionalType: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/60 font-medium"
                >
                  <option value="Trainer">Trainer</option>
                  <option value="Nutritionist">Nutritionist</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Session Fee (Rs.)
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={addForm.sessionFee}
                  onChange={(e) =>
                    setAddForm((p) => ({
                      ...p,
                      sessionFee: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/60 font-medium"
                />
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                Specialization
              </label>

              <input
                type="text"
                placeholder="e.g. Strength & Conditioning, HIIT, Yoga"
                value={addForm.specialization}
                onChange={(e) =>
                  setAddForm((p) => ({
                    ...p,
                    specialization: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/60 font-medium"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
                Temporary Password (Optional)
              </label>

              <input
                type="text"
                placeholder="Auto-generated if left blank"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm((p) => ({
                    ...p,
                    password: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-btn border border-gray-200 bg-white/70 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/60 font-medium"
              />
            </div>

            <p className="text-xs text-gray-400 font-medium">
              An onboarding email with login credentials & profile completion
              instructions will be sent automatically.
            </p>

            {/* Modal Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 rounded-btn border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-btn bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold shadow-card hover:shadow-card-hover disabled:opacity-60 transition-all"
              >
                {actionLoading
                  ? "Sending Invitation..."
                  : "Invite & Create Account"}
              </button>
            </div>
          </form>
        </Modal>

        {/* DELETE MODAL */}
        <Modal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Remove Professional Account"
          maxWidth="max-w-sm"
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <p className="text-gray-800 font-bold text-base mb-1">
              Remove {selectedPro?.firstName} {selectedPro?.lastName}?
            </p>

            <p className="text-gray-500 text-xs mb-6 font-medium">
              This action will permanently delete their account.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="flex-1 py-2.5 rounded-btn border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-btn bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-60 shadow-card"
              >
                {actionLoading ? "Removing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};
