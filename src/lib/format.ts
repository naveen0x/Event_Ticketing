import { format, isSameDay } from "date-fns";
import { TZDate, tz } from "@date-fns/tz";

// All event times are shown and entered in this zone, regardless of the
// server's (often UTC in Docker) or the viewer's local timezone.
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE || "Asia/Colombo";

const inAppZone = { in: tz(APP_TIME_ZONE) };

function fmt(date: Date, pattern: string): string {
  return format(date, pattern, inAppZone);
}

export function formatEventDateRange(startAt: Date, endAt: Date | null): string {
  const start = fmt(startAt, "EEE, d MMM yyyy 'at' h:mm a");
  if (!endAt) return start;

  if (isSameDay(startAt, endAt, inAppZone)) {
    return `${fmt(startAt, "EEE, d MMM yyyy")} · ${fmt(startAt, "h:mm a")} – ${fmt(endAt, "h:mm a")}`;
  }

  return `${start} – ${fmt(endAt, "EEE, d MMM yyyy 'at' h:mm a")}`;
}

export function formatDateTime(date: Date): string {
  return fmt(date, "d MMM yyyy, h:mm a");
}

// Date -> "yyyy-MM-ddTHH:mm" in the app timezone, for <input type="datetime-local">.
export function toDatetimeLocal(value?: Date | string | null): string {
  if (!value) return "";
  return fmt(new Date(value), "yyyy-MM-dd'T'HH:mm");
}

// "yyyy-MM-ddTHH:mm" (wall-clock time in the app timezone) -> ISO instant.
export function fromDatetimeLocal(value: string): string {
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, h, min, APP_TIME_ZONE).getTime()).toISOString();
}
