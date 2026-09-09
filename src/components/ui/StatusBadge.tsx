const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 ring-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 ring-rose-200",
  ATTENDED: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  NOT_ATTENDED: "bg-slate-100 text-slate-700 ring-slate-200",
  ACTIVE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  DISABLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

const LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ATTENDED: "Attended",
  NOT_ATTENDED: "Not attended",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  const label = LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
