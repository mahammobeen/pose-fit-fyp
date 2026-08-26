import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/admin/Modal";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconCheckCircle,
} from "../../components/admin/Icons";

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

  useEffect(() => { fetchProfessionals(); }, [fetchProfessionals]);

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
      setAddError("First name, last name, and email are required."); return;
    }
    setActionLoading(true); setAddError("");
    try {
      await httpClient.post("/admin/add-professional", addForm);
      showToast("Professional invitation sent & account created!");
      setAddOpen(false);
      setAddForm(EMPTY_FORM);
      fetchProfessionals();
    } catch (err) {
      setAddError(err?.response?.data?.message || "Failed to add professional.");
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await httpClient.delete(`/admin/delete-professional/${selectedPro._id}`);
      showToast("Professional removed successfully", "error");
      setDeleteOpen(false);
      fetchProfessionals();
    } catch {
      showToast("Failed to delete professional.", "error");
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
        <div className="px-8 pt-8 pb-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Professionals Directory
            </span>
            <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">Professionals</h1>
            <p className="text-stone-500 font-medium text-sm mt-1">Onboard and manage certified Trainers, Nutritionists, and Stripe Payout accounts.</p>
          </div>
          <button
            id="add-professional-btn"
            onClick={() => { setAddForm(EMPTY_FORM); setAddError(""); setAddOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-white text-sm shadow-sm hover:opacity-95 active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
          >
            <IconPlus className="w-4 h-4" />
            <span>Invite Professional</span>
          </button>
        </div>

        {/* Status Counts */}
        <div className="px-8 mb-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Pros", value: professionals.length, bg: "bg-white", border: "border-stone-200", textColor: "text-stone-800" },
            { label: "Invited", value: professionals.filter(p => p.professionalStatus === "invited" || p.professionalStatus === "INVITED").length, bg: "bg-blue-50/70", border: "border-blue-200/80", textColor: "text-blue-800" },
            { label: "Pending Verification", value: professionals.filter(p => p.professionalStatus === "pending_verification" || p.professionalStatus === "PENDING_VERIFICATION" || p.professionalStatus === "PENDING").length, bg: "bg-amber-50/70", border: "border-amber-200/80", textColor: "text-amber-800" },
            { label: "Approved & Live", value: professionals.filter(p => p.professionalStatus === "approved" || p.professionalStatus === "APPROVED").length, bg: "bg-emerald-50/70", border: "border-emerald-200/80", textColor: "text-emerald-800" },
            { label: "Stripe Connected", value: professionals.filter(p => p.stripeAccountId && p.payoutsEnabled).length, bg: "bg-sky-50/70", border: "border-sky-200/80", textColor: "text-sky-800" },
          ].map(({ label, value, bg, border, textColor }) => (
            <div key={label} className={`rounded-2xl px-4 py-3 border shadow-xs flex items-center justify-between ${bg} ${border}`}>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{label}</span>
              <span className={`text-xl font-black ${textColor}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="px-8 mb-4">
          <div className="relative max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <IconSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name, email, specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-300 text-stone-700 font-medium shadow-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="px-8">
          <div className="bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-52">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-stone-400 font-medium">
                {search ? "No professionals match your search." : "No professionals found."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {["Name", "Email", "Role", "Specialization", "Session Fee", "Status", "Stripe Payouts", "Actions"].map((h) => (
                        <th key={h} className="text-left px-5 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((pro) => (
                      <tr key={pro._id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-black shrink-0"
                              style={{ background: "linear-gradient(135deg, #fb923c, #f97316)" }}
                            >
                              {pro.firstName?.[0]?.toUpperCase()}
                            </div>
                            <span className="font-bold text-stone-800">{pro.firstName} {pro.lastName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-stone-600 font-medium">{pro.email}</td>
                        <td className="px-5 py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
                            {pro.professionalType || "Trainer"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-stone-600 font-medium">{pro.specialization || "General"}</td>
                        <td className="px-5 py-4 text-stone-800 font-bold">
                          ${pro.sessionFee ? Number(pro.sessionFee).toFixed(2) : "0.00"}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={pro.professionalStatus || "invited"} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {pro.stripeAccountId ? (
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${pro.payoutsEnabled ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                                {pro.payoutsEnabled ? "Connected & Enabled" : "Pending Setup"}
                              </span>
                              {pro.maskedBank && (
                                <p className="text-[11px] text-stone-500 font-semibold mt-0.5">
                                  Bank: {pro.maskedBank}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                              Not Connected
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => { setSelectedPro(pro); setDeleteOpen(true); }}
                            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-colors"
                          >
                            <IconTrash className="w-3.5 h-3.5" />
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
          <p className="text-xs text-stone-400 mt-3 font-semibold">
            Showing {filtered.length} of {professionals.length} professionals
          </p>
        </div>

        {/* ADD / INVITE MODAL */}
        <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Invite New Professional">
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{addError}</div>}
            
            <div className="grid grid-cols-2 gap-3">
              {[["firstName", "First Name"], ["lastName", "Last Name"]].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">{l}</label>
                  <input
                    type="text"
                    value={addForm[k]}
                    onChange={(e) => setAddForm((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Role / Type</label>
                <select
                  value={addForm.professionalType}
                  onChange={(e) => setAddForm((p) => ({ ...p, professionalType: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium bg-white"
                >
                  <option value="Trainer">Trainer</option>
                  <option value="Nutritionist">Nutritionist</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Session Fee ($)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  value={addForm.sessionFee}
                  onChange={(e) => setAddForm((p) => ({ ...p, sessionFee: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Specialization</label>
              <input
                type="text"
                placeholder="e.g. Strength & Conditioning, HIIT, Yoga"
                value={addForm.specialization}
                onChange={(e) => setAddForm((p) => ({ ...p, specialization: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">Temporary Password (Optional)</label>
              <input
                type="text"
                placeholder="Auto-generated if left blank"
                value={addForm.password}
                onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
              />
            </div>

            <p className="text-xs text-stone-400 font-medium">An onboarding email with login credentials & profile completion instructions will be sent automatically.</p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-xs hover:opacity-90 disabled:opacity-60 transition-all"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              >
                {actionLoading ? "Sending Invitation..." : "Invite & Create Account"}
              </button>
            </div>
          </form>
        </Modal>

        {/* DELETE MODAL */}
        <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Remove Professional Account" maxWidth="max-w-sm">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <IconTrash className="w-6 h-6" />
            </div>
            <p className="text-stone-800 font-bold text-base mb-1">Remove {selectedPro?.firstName} {selectedPro?.lastName}?</p>
            <p className="text-stone-500 text-xs mb-6 font-medium">This action will permanently delete their account.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-60 shadow-xs"
              >
                {actionLoading ? "Removing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
