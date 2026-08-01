/** Display timezone for all user-facing timestamps in DamnArt CRM. */
export const APP_TIMEZONE = "Asia/Kolkata";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function zonedParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `01 Aug 2026` in IST */
export function formatDateIST(
  value: Date | string | number | null | undefined
): string {
  if (value == null) {
    return "—";
  }
  const date = toDate(value);
  if (!date) {
    return "—";
  }
  const parts = zonedParts(date);
  return `${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** `01 Aug 2026 10:40` in IST */
export function formatDateTimeIST(
  value: Date | string | number | null | undefined
): string {
  if (value == null) {
    return "—";
  }
  const date = toDate(value);
  if (!date) {
    return "—";
  }
  const parts = zonedParts(date);
  return `${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** `01 Aug 2026 10:40:05` in IST */
export function formatDateTimeSecondsIST(
  value: Date | string | number | null | undefined
): string {
  if (value == null) {
    return "—";
  }
  const date = toDate(value);
  if (!date) {
    return "—";
  }
  const parts = zonedParts(date);
  return `${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}
