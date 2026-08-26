import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/admin/Modal";
import StatusBadge from "../../components/admin/StatusBadge";
import { httpClient } from "../../lib/http";
import {
  IconSearch,
  IconEdit,
  IconTrash,
  IconLock,
} from "../../components/admin/Icons";

const EMPTY_EDIT = { firstName: "", lastName: "", email: "" };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form & Feedback
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editError, setEditError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/admin/user-details");
      setUsers(res.data?.users || []);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  /* ---- EDIT USER ---- */
  const openEdit = (user) => {
    setSelectedUser(user);
    setEditForm({ firstName: user.firstName, lastName: user.lastName, email: user.email });
    setEditError("");
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true); setEditError("");
    try {
      await httpClient.put(`/admin/update-user/${selectedUser._id}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
      });
      showToast("User updated successfully!");
      setEditOpen(false);
      fetchUsers();
    } catch (err) {
      setEditError(err?.response?.data?.message || "Failed to update user.");
    } finally { setActionLoading(false); }
  };

  /* ---- DELETE USER ---- */
  const openDelete = (user) => { setSelectedUser(user); setDeleteOpen(true); };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await httpClient.delete(`/admin/delete-user/${selectedUser._id}`);
      showToast("User deleted successfully", "error");
      setDeleteOpen(false);
      fetchUsers();
    } catch {
      showToast("Failed to delete user.", "error");
    } finally { setActionLoading(false); }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen pb-16" style={{ background: "#f5f7f2" }}>
        {/* Toast */}
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
              User Directory
            </span>
            <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">Users</h1>
            <p className="text-stone-500 font-medium text-sm mt-1">View, search, edit, and manage registered users on the platform.</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-8 mb-4">
          <div className="relative max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              <IconSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
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
                {search ? "No users match your search." : "No users found."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {["Name", "Email", "Verified", "Joined", "Actions"].map((h) => (
                        <th key={h} className="text-left px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((user) => (
                      <tr key={user._id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-black shrink-0"
                              style={{ background: "linear-gradient(135deg, #a7f3d0, #34d399, #059669)" }}
                            >
                              {user.firstName?.[0]?.toUpperCase()}
                            </div>
                            <span className="font-bold text-stone-800">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-stone-600 font-medium">{user.email}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={user.isVerified ? "verified" : "unverified"} />
                        </td>
                        <td className="px-6 py-4 text-stone-500 text-xs font-medium">
                          {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(user)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 transition-colors"
                            >
                              <IconEdit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => openDelete(user)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-colors"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-3 font-semibold">
            Showing {filtered.length} of {users.length} users
          </p>
        </div>

        {/* EDIT MODAL (EMAIL DISABLED FOR ADMINS) */}
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit User">
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{editError}</div>}
            
            <div className="grid grid-cols-2 gap-3">
              {[["firstName", "First Name"], ["lastName", "Last Name"]].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">{l}</label>
                  <input
                    type="text"
                    value={editForm[k]}
                    onChange={(e) => setEditForm((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-300 font-medium"
                  />
                </div>
              ))}
            </div>

            {/* DISABLED EMAIL FIELD */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">Email</label>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 flex items-center gap-1">
                  <IconLock className="w-3 h-3" /> Locked
                </span>
              </div>
              <input
                type="email"
                value={editForm.email}
                disabled
                readOnly
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 text-sm font-medium cursor-not-allowed select-none opacity-80"
              />
              <p className="text-[11px] text-stone-400 mt-1 font-medium">
                User email cannot be modified.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-xs hover:opacity-90 disabled:opacity-60 transition-all"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>

        {/* DELETE MODAL */}
        <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete User" maxWidth="max-w-sm">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <IconTrash className="w-6 h-6" />
            </div>
            <p className="text-stone-800 font-bold text-base mb-1">
              Delete {selectedUser?.firstName} {selectedUser?.lastName}?
            </p>
            <p className="text-stone-500 text-xs mb-6 font-medium">This action cannot be undone.</p>
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
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors disabled:opacity-60 shadow-xs"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
