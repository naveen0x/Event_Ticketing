"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Attendance, Registration, Ticket } from "@prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { formatDateTime } from "@/lib/format";

type RegistrationWithTicket = Registration & {
  ticket: (Ticket & { attendance: Attendance | null }) | null;
};

type Tab = "PENDING" | "APPROVED" | "REJECTED" | "ALL";
type RowAction = "approve" | "reject" | "resend" | "revoke" | "delete";

const TABS: { key: Tab; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

export function RegistrationsPanel({
  initialRegistrations,
}: {
  initialRegistrations: RegistrationWithTicket[];
}) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<{ id: string; action: RowAction } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of registrations) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [registrations]);

  const visible = useMemo(() => {
    const list = tab === "ALL" ? registrations : registrations.filter((r) => r.status === tab);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.ticket?.ticketCode.toLowerCase().includes(q)
    );
  }, [registrations, tab, query]);

  function isPending(id: string, action: RowAction) {
    return pending?.id === id && pending.action === action;
  }

  async function approve(id: string) {
    setPending({ id, action: "approve" });
    const res = await fetch(`/api/registrations/${id}/approve`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPending(null);

    if (!res.ok) {
      toast.error(data?.error ?? "Failed to approve");
      return;
    }

    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "APPROVED", ticket: data.ticket } : r))
    );
    toast.success("Approved and ticket emailed");
  }

  async function reject(id: string) {
    setPending({ id, action: "reject" });
    const res = await fetch(`/api/registrations/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(null);
    setRejectingId(null);
    setRejectReason("");

    if (!res.ok) {
      toast.error(data?.error ?? "Failed to reject");
      return;
    }

    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "REJECTED", rejectionReason: data.registration.rejectionReason }
          : r
      )
    );
    toast.success("Registration rejected");
  }

  async function resend(reg: RegistrationWithTicket) {
    if (!reg.ticket) return;
    setPending({ id: reg.id, action: "resend" });
    const res = await fetch(`/api/tickets/${reg.ticket.ticketCode}/resend`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPending(null);

    if (!res.ok) {
      toast.error(data?.error ?? "Failed to resend ticket");
      return;
    }
    toast.success(`Ticket resent to ${reg.email}`);
  }

  async function revoke(reg: RegistrationWithTicket) {
    if (!reg.ticket) return;
    if (
      !window.confirm(
        `Revoke ${reg.fullName}'s ticket? Their QR code stops working immediately and they'll move to the Rejected list.`
      )
    ) {
      return;
    }

    setPending({ id: reg.id, action: "revoke" });
    const res = await fetch(`/api/tickets/${reg.ticket.ticketCode}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setPending(null);

    if (!res.ok) {
      toast.error(data?.error ?? "Failed to revoke ticket");
      return;
    }

    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === reg.id
          ? { ...r, status: "REJECTED", rejectionReason: "Ticket revoked by admin", ticket: null }
          : r
      )
    );
    toast.success("Ticket revoked");
  }

  async function deleteRegistration(reg: RegistrationWithTicket) {
    if (!window.confirm(`Permanently delete ${reg.fullName}'s rejected registration?`)) {
      return;
    }

    setPending({ id: reg.id, action: "delete" });
    const res = await fetch(`/api/registrations/${reg.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setPending(null);

    if (!res.ok) {
      toast.error(data?.error ?? "Failed to delete registration");
      return;
    }

    setRegistrations((prev) => prev.filter((r) => r.id !== reg.id));
    toast.success("Registration deleted");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 sm:flex-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {t.key !== "ALL" && counts[t.key] ? (
                <span className="ml-1.5 text-xs text-slate-400">({counts[t.key]})</span>
              ) : null}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search by name, email or ticket code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No registrations in this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Attendee</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Email</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Submitted</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Ticket</th>
                <th className="px-4 py-2 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((reg) => {
                const attended = reg.ticket?.attendance?.status === "ATTENDED";
                const anyPending = pending?.id === reg.id;
                return (
                  <tr key={reg.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{reg.fullName}</div>
                      {reg.organization && (
                        <div className="text-xs text-slate-500">{reg.organization}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{reg.email}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDateTime(new Date(reg.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {reg.ticket?.ticketCode ?? "—"}
                      {attended && (
                        <div className="mt-1">
                          <StatusBadge status="ATTENDED" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {reg.status === "PENDING" &&
                        (rejectingId === reg.id ? (
                          <div className="flex flex-col items-end gap-2">
                            <input
                              autoFocus
                              placeholder="Reason (optional)"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-44 rounded-md border-0 px-2 py-1 text-xs ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                loading={isPending(reg.id, "reject")}
                                onClick={() => reject(reg.id)}
                              >
                                Confirm reject
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={anyPending}
                              onClick={() => setRejectingId(reg.id)}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              loading={isPending(reg.id, "approve")}
                              disabled={anyPending && !isPending(reg.id, "approve")}
                              onClick={() => approve(reg.id)}
                            >
                              Approve
                            </Button>
                          </div>
                        ))}

                      {reg.status === "REJECTED" && (
                        <div className="flex flex-col items-end gap-1.5">
                          {reg.rejectionReason && (
                            <span className="block text-right text-xs text-slate-400">
                              {reg.rejectionReason}
                            </span>
                          )}
                          <div className="flex justify-end gap-2">
                                                        <Button
                              size="sm"
                              loading={isPending(reg.id, "approve")}
                              disabled={anyPending && !isPending(reg.id, "approve")}
                              onClick={() => approve(reg.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={isPending(reg.id, "delete")}
                              disabled={anyPending && !isPending(reg.id, "delete")}
                              onClick={() => deleteRegistration(reg)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}

                      {reg.status === "APPROVED" && reg.ticket && !attended && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={isPending(reg.id, "resend")}
                            disabled={anyPending && !isPending(reg.id, "resend")}
                            onClick={() => resend(reg)}
                          >
                            Resend
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={isPending(reg.id, "revoke")}
                            disabled={anyPending && !isPending(reg.id, "revoke")}
                            onClick={() => revoke(reg)}
                          >
                            Revoke
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
