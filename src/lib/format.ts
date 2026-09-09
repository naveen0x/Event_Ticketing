import { format, isSameDay } from "date-fns";

export function formatEventDateRange(startAt: Date, endAt: Date | null): string {
  const start = format(startAt, "EEE, d MMM yyyy 'at' h:mm a");
  if (!endAt) return start;

  if (isSameDay(startAt, endAt)) {
    return `${format(startAt, "EEE, d MMM yyyy")} · ${format(startAt, "h:mm a")} – ${format(endAt, "h:mm a")}`;
  }

  return `${start} – ${format(endAt, "EEE, d MMM yyyy 'at' h:mm a")}`;
}

export function formatDateTime(date: Date): string {
  return format(date, "d MMM yyyy, h:mm a");
}
