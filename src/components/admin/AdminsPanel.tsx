"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/format";
import { AdminForm, type PublicAdmin } from "@/components/admin/AdminForm";

export function AdminsPanel({
  initialAdmins,
  currentAdminId,
}: {
  initialAdmins: PublicAdmin[];
  currentAdminId: string;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [editing, setEditing] = useState<PublicAdmin | null>(null);
  const [pending, setPending] = useState<{ id: string; action: "delete" | "reactivate" } | null>(
    null
  );

  function upsert(admin: PublicAdmin) {
    setAdmins((prev) => {
      const exists = prev.some((a) => a.id === admin.id);
      return exists ? prev.map((a) => (a.id === admin.id ? admin : a)) : [...prev, admin];
    });
  }

  function handleSaved(admin: PublicAdmin) {
    const wasEdit = Boolean(editing);
    upsert(admin);
    setEditing(null);
    toast.success(wasEdit ? "Admin updated" : "Admin created");
  }

  async function remove(admin: PublicAdmin) {
    if (!window.confirm(`Delete ${admin.name}? They'll immediately lose access to sign in.`)) {
      return;
    }
    setPending({ id: admin.id, action: "delete" });
    const res = await fetch(`/api/admins/${admin.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setPending(null);

    if (!res.ok) {
      toast.error(typeof data?.error === "string" ? data.error : "Failed to delete admin");
      return;
    }

    upsert(data.admin);
    toast.success(`${admin.name} deleted`);
  }

  async function reactivate(admin: PublicAdmin) {
    setPending({ id: admin.id, action: "reactivate" });
    const res = await fetch(`/api/admins/${admin.id}/reactivate`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPending(null);

    if (!res.ok) {
      toast.error(typeof data?.error === "string" ? data.error : "Failed to reactivate admin");
      return;
    }

    upsert(data.admin);
    toast.success(`${admin.name} reactivated`);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Admins</h1>
        <Card className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Name</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Email</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Role</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Added</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((admin) => {
                const isSelf = admin.id === currentAdminId;
                const isDisabled = Boolean(admin.disabledAt);
                const isPending = (action: "delete" | "reactivate") =>
                  pending?.id === admin.id && pending.action === action;

                return (
                  <tr key={admin.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {admin.name}
                      {isSelf && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{admin.email}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {admin.role === "SUPER_ADMIN" ? "Super admin" : "Organizer"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={isDisabled ? "DISABLED" : "ACTIVE"} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(new Date(admin.createdAt))}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(admin)}>
                          Edit
                        </Button>
                        {isDisabled ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={isPending("reactivate")}
                            onClick={() => reactivate(admin)}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={isSelf}
                            title={isSelf ? "You cannot delete your own account" : undefined}
                            loading={isPending("delete")}
                            onClick={() => remove(admin)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {editing ? `Edit ${editing.name}` : "Add admin"}
        </h2>
        <Card className="p-6">
          <AdminForm
            key={editing?.id ?? "create"}
            initial={editing}
            onSaved={handleSaved}
            onCancelEdit={() => setEditing(null)}
          />
        </Card>
      </div>
    </div>
  );
}
