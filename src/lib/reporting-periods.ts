import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import type { DashboardPeriodPreset } from "@/types/dashboard-share";

export type ReportingGranularity = "day" | "week" | "month";

export interface ResolvedReportingPeriod {
  label: string;
  startDate?: Date;
  endDate?: Date;
  previousStartDate?: Date;
  previousEndDate?: Date;
  timezone: string;
  granularity: ReportingGranularity;
}

function zonedParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function resolveGranularity(start?: Date, end?: Date): ReportingGranularity {
  if (!start || !end) {
    return "month";
  }
  const days =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days <= 31) {
    return "day";
  }
  if (days <= 180) {
    return "week";
  }
  return "month";
}

function previousPeriod(
  start: Date,
  end: Date
): { previousStartDate: Date; previousEndDate: Date } {
  const durationMs = end.getTime() - start.getTime();
  const previousEndDate = new Date(start.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - durationMs);
  return { previousStartDate, previousEndDate };
}

export function resolveReportingPeriod(options: {
  preset: DashboardPeriodPreset;
  timezone?: string;
  customStartDate?: Date;
  customEndDate?: Date;
  now?: Date;
}): ResolvedReportingPeriod {
  const timezone = options.timezone ?? "Asia/Kolkata";
  const now = options.now ?? new Date();
  const zoned = zonedParts(now, timezone);
  const localNow = new Date(
    Date.UTC(zoned.year, zoned.month - 1, zoned.day, 12, 0, 0)
  );

  if (options.preset === "all_time") {
    return {
      label: "All time",
      timezone,
      granularity: "month",
    };
  }

  if (options.preset === "custom") {
    if (!options.customStartDate || !options.customEndDate) {
      throw new Error("Custom period requires start and end dates.");
    }
    if (options.customEndDate < options.customStartDate) {
      throw new Error("End date must be on or after start date.");
    }
    const startDate = startOfDay(options.customStartDate);
    const endDate = endOfDay(options.customEndDate);
    const previous = previousPeriod(startDate, endDate);
    return {
      label: `${startDate.toISOString().slice(0, 10)} – ${endDate.toISOString().slice(0, 10)}`,
      startDate,
      endDate,
      previousStartDate: previous.previousStartDate,
      previousEndDate: previous.previousEndDate,
      timezone,
      granularity: resolveGranularity(startDate, endDate),
    };
  }

  let startDate: Date;
  let endDate: Date = endOfDay(localNow);
  let label = "";

  switch (options.preset) {
    case "last_7_days":
      startDate = startOfDay(subDays(localNow, 6));
      label = "Last 7 days";
      break;
    case "previous_7_days":
      endDate = endOfDay(subDays(localNow, 7));
      startDate = startOfDay(subDays(localNow, 13));
      label = "Previous 7 days";
      break;
    case "this_month":
      startDate = startOfMonth(localNow);
      label = "This month";
      break;
    case "last_month": {
      const lastMonth = subMonths(localNow, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      label = "Last month";
      break;
    }
    case "last_30_days":
      startDate = startOfDay(subDays(localNow, 29));
      label = "Last 30 days";
      break;
    case "last_90_days":
      startDate = startOfDay(subDays(localNow, 89));
      label = "Last 90 days";
      break;
    case "this_year":
      startDate = startOfYear(localNow);
      label = "This year";
      break;
    case "last_year": {
      const lastYear = subYears(localNow, 1);
      startDate = startOfYear(lastYear);
      endDate = endOfYear(lastYear);
      label = "Last year";
      break;
    }
    case "rolling_12_months":
      startDate = startOfDay(subMonths(localNow, 12));
      label = "Rolling last 12 months";
      break;
    default:
      startDate = startOfMonth(localNow);
      label = "This month";
  }

  const previous = previousPeriod(startDate, endDate);
  return {
    label,
    startDate,
    endDate,
    previousStartDate: previous.previousStartDate,
    previousEndDate: previous.previousEndDate,
    timezone,
    granularity: resolveGranularity(startDate, endDate),
  };
}

export function getMonthKey(date: Date, timezone: string): string {
  const parts = zonedParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function calculatePercentChange(
  current: number,
  previous: number
): { value: number | null; label: string } {
  if (previous === 0) {
    if (current === 0) {
      return { value: 0, label: "No previous-period baseline" };
    }
    return { value: null, label: `+${current} (no previous-period baseline)` };
  }
  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change)) {
    return { value: null, label: "No previous-period baseline" };
  }
  const rounded = Math.round(change * 10) / 10;
  const direction = rounded > 0 ? "Up" : rounded < 0 ? "Down" : "No change";
  return {
    value: rounded,
    label: `${direction} ${Math.abs(rounded)}% from previous period`,
  };
}

export function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}
