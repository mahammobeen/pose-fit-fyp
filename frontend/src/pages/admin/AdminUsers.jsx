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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setEditError("");

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
    } finally {
      setActionLoading(false);
    }
  };

  /* ---- DELETE USER ---- */
  const openDelete = (user) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    setActionLoading(true);

    try {
      await httpClient.delete(`/admin/delete-user/${selectedUser._id}`);

      showToast("User deleted successfully", "error");
      setDeleteOpen(false);
      fetchUsers();
    } catch {
      showToast("Failed to delete user.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-transparent pb-16 font-sans">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed right-5 top-5 z-50 rounded-2xl border px-5 py-3 text-sm font-bold text-white shadow-card-hover transition-all ${
              toast.type === "error"
                ? "border-rose-600 bg-rose-500"
                : "border-brand-dark bg-brand-dark"
            }`}
            style={{ animation: "modalIn 0.2s ease" }}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-brand-light/70 bg-brand-light/40 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
              User Directory
            </span>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
              Users
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-500">
              View, search, edit, and manage registered users on the platform.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 px-4 sm:px-6 lg:px-8">
          <div className="relative max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <IconSearch className="h-4 w-4" />
            </span>

            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-btn border border-gray-200 bg-white/70 py-2.5 pl-10 pr-4 text-sm font-medium text-gray-800 shadow-card outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
            />
          </div>
        </div>

        {/* Table */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl">
            {loading ? (
              <div className="flex h-52 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand-dark" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center font-medium text-gray-400">
                {search ? "No users match your search." : "No users found."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-light/40 bg-brand-light/10">
                      {["Name", "Email", "Verified", "Joined", "Actions"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-brand-light/30">
                    {filtered.map((user) => (
                      <tr
                        key={user._id}
                        className="transition-colors hover:bg-brand-light/10"
                      >
                        {/* Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand text-xs font-black text-white shadow-sm">
                              {user.firstName?.[0]?.toUpperCase()}
                            </div>

                            <span className="font-bold text-gray-800">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 font-medium text-gray-600">
                          {user.email}
                        </td>

                        {/* Verified */}
                        <td className="px-6 py-4">
                          <StatusBadge
                            status={user.isVerified ? "verified" : "unverified"}
                          />
                        </td>

                        {/* Joined */}
                        <td className="px-6 py-4 text-xs font-medium text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(user)}
                              className="flex items-center gap-1 rounded-xl border border-brand-light/70 bg-brand-light/25 px-3 py-1.5 text-xs font-bold text-brand-dark transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-light/40"
                            >
                              <IconEdit className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => openDelete(user)}
                              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-100"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
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

          <p className="mt-3 text-xs font-semibold text-gray-400">
            Showing {filtered.length} of {users.length} users
          </p>
        </div>

        {/* EDIT MODAL (EMAIL DISABLED FOR ADMINS) */}
        <Modal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit User"
        >
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && (
              <div className="rounded-card border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                ["firstName", "First Name"],
                ["lastName", "Last Name"],
              ].map(([k, l]) => (
                <div key={k}>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">
                    {l}
                  </label>

                  <input
                    type="text"
                    value={editForm[k]}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        [k]: e.target.value,
                      }))
                    }
                    className="w-full rounded-btn border border-gray-200 bg-white/70 px-3.5 py-2.5 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                  />
                </div>
              ))}
            </div>

            {/* DISABLED EMAIL FIELD */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                  Email
                </label>

                <span className="flex items-center gap-1 rounded-md border border-accent-orange/70 bg-accent-orange/30 px-2 py-0.5 text-[11px] font-bold text-accent-orange-dark">
                  <IconLock className="h-3 w-3" />
                  Locked
                </span>
              </div>

              <input
                type="email"
                value={editForm.email}
                disabled
                readOnly
                className="w-full cursor-not-allowed select-none rounded-btn border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm font-medium text-gray-500 opacity-80"
              />

              <p className="mt-1 text-[11px] font-medium text-gray-400">
                User email cannot be modified.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="flex-1 rounded-btn border border-gray-200 bg-white/70 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-white hover:text-gray-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 rounded-btn bg-gray-800 py-2.5 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>

        {/* DELETE MODAL */}
        <Modal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Delete User"
          maxWidth="max-w-sm"
        >
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <IconTrash className="h-6 w-6" />
            </div>

            <p className="mb-1 text-base font-bold text-gray-800">
              Delete {selectedUser?.firstName} {selectedUser?.lastName}?
            </p>

            <p className="mb-6 text-xs font-medium text-gray-500">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="flex-1 rounded-btn border border-gray-200 bg-white/70 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-white"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 rounded-btn bg-rose-500 py-2.5 text-sm font-bold text-white shadow-card transition-all hover:bg-rose-600 disabled:opacity-60"
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
