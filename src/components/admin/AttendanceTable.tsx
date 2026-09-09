"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { Attendance, Registration, Ticket } from "@prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { formatDateTime } from "@/lib/format";
import { toCsv, downloadCsv } from "@/lib/csv";

type Row = Registration & { ticket: (Ticket & { attendance: Attendance | null }) | null };
type Tab = "ATTENDED" | "NOT_ATTENDED" | "ALL";

const TABS: { key: Tab; label: string }[] = [
  { key: "ATTENDED", label: "Attended" },
  { key: "NOT_ATTENDED", label: "Not attended" },
  { key: "ALL", label: "All" },
];

function isAttended(row: Row) {
  return row.ticket?.attendance?.status === "ATTENDED";
}

export function AttendanceTable({
  initialRows,
  eventTitle,
}: {
  initialRows: Row[];
  eventTitle?: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [tab, setTab] = useState<Tab>("ALL");
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const attended = rows.filter(isAttended).length;
    return { ATTENDED: attended, NOT_ATTENDED: rows.length - attended, ALL: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === "ATTENDED") list = list.filter(isAttended);
    else if (tab === "NOT_ATTENDED") list = list.filter((r) => !isAttended(r));

    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.ticket?.ticketCode.toLowerCase().includes(q)
    );
  }, [rows, tab, query]);

  async function toggle(row: Row) {
    if (!row.ticket?.attendance) return;
    const attendance = row.ticket.attendance;
    const attended = attendance.status === "ATTENDED";
    const url = `/api/attendance/${attendance.id}/${attended ? "undo" : "check-in"}`;

    setPendingId(row.id);
    const res = await fetch(url, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPendingId(null);

    if (!res.ok) {
      toast.error(data?.error ?? "Failed to update attendance");
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id && r.ticket
          ? { ...r, ticket: { ...r.ticket, attendance: data.attendance } }
          : r
      )
    );
  }

  function exportCsv() {
    const csv = toCsv(
      ["Full name", "Email", "Organization", "Ticket code", "Status", "Checked in at"],
      filtered.map((row) => [
        row.fullName,
        row.email,
        row.organization ?? "",
        row.ticket?.ticketCode ?? "",
        isAttended(row) ? "Attended" : "Not attended",
        row.ticket?.attendance?.checkedInAt
          ? formatDateTime(new Date(row.ticket.attendance.checkedInAt))
          : "",
      ])
    );

    const datePart = new Date().toISOString().slice(0, 10);
    const namePart = (eventTitle ?? "event")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    downloadCsv(`attendance-${namePart}-${datePart}.csv`, csv);
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
              <span className="ml-1.5 text-xs text-slate-400">({counts[t.key]})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name, email or ticket code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <Button type="button" variant="secondary" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Attendee</th>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Ticket</th>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Checked in</th>
              <th className="px-4 py-2 text-right font-medium text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{row.fullName}</div>
                  <div className="text-xs text-slate-500">{row.email}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {row.ticket?.ticketCode ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.ticket?.attendance?.status ?? "NOT_ATTENDED"} />
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {row.ticket?.attendance?.checkedInAt
                    ? formatDateTime(new Date(row.ticket.attendance.checkedInAt))
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant={row.ticket?.attendance?.status === "ATTENDED" ? "secondary" : "primary"}
                    loading={pendingId === row.id}
                    onClick={() => toggle(row)}
                  >
                    {row.ticket?.attendance?.status === "ATTENDED" ? "Undo check-in" : "Manual check-in"}
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No matching attendees.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
