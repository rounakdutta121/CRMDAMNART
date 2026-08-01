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

interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

function zonedParts(date: Date, timezone: string): ZonedDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    millisecond: 0,
  };
}

function getTimeZoneOffsetMs(date: Date, timezone: string): number {
  const parts = zonedParts(date, timezone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  );
  return asUtc - date.getTime();
}

/** Convert a wall-clock date/time in `timezone` to a UTC `Date`. */
export function zonedDateTimeToUtc(
  parts: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
  },
  timezone: string
): Date {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
    parts.millisecond ?? 0
  );
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timezone);
  let result = new Date(utcGuess - offset);

  // Correct once more around DST transitions
  const offset2 = getTimeZoneOffsetMs(result, timezone);
  if (offset2 !== offset) {
    result = new Date(utcGuess - offset2);
  }

  return result;
}

function startOfZonedDay(
  year: number,
  month: number,
  day: number,
  timezone: string
): Date {
  return zonedDateTimeToUtc({ year, month, day }, timezone);
}

function endOfZonedDay(
  year: number,
  month: number,
  day: number,
  timezone: string
): Date {
  const next = addDaysToParts(year, month, day, 1);
  const startOfNextDay = startOfZonedDay(
    next.year,
    next.month,
    next.day,
    timezone
  );
  return new Date(startOfNextDay.getTime() - 1);
}

function addDaysToParts(
  year: number,
  month: number,
  day: number,
  deltaDays: number
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + deltaDays, 12, 0, 0));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatYmdInZone(date: Date, timezone: string): string {
  const parts = zonedParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
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
  const nowParts = zonedParts(now, timezone);

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
    const startParts = zonedParts(options.customStartDate, timezone);
    const endParts = zonedParts(options.customEndDate, timezone);
    const startDate = startOfZonedDay(
      startParts.year,
      startParts.month,
      startParts.day,
      timezone
    );
    const endDate = endOfZonedDay(
      endParts.year,
      endParts.month,
      endParts.day,
      timezone
    );
    const previous = previousPeriod(startDate, endDate);
    return {
      label: `${formatYmdInZone(startDate, timezone)} – ${formatYmdInZone(endDate, timezone)}`,
      startDate,
      endDate,
      previousStartDate: previous.previousStartDate,
      previousEndDate: previous.previousEndDate,
      timezone,
      granularity: resolveGranularity(startDate, endDate),
    };
  }

  let startDate: Date;
  let endDate: Date = endOfZonedDay(
    nowParts.year,
    nowParts.month,
    nowParts.day,
    timezone
  );
  let label = "";

  switch (options.preset) {
    case "last_7_days": {
      const start = addDaysToParts(
        nowParts.year,
        nowParts.month,
        nowParts.day,
        -6
      );
      startDate = startOfZonedDay(start.year, start.month, start.day, timezone);
      label = "Last 7 days";
      break;
    }
    case "previous_7_days": {
      const end = addDaysToParts(
        nowParts.year,
        nowParts.month,
        nowParts.day,
        -7
      );
      const start = addDaysToParts(
        nowParts.year,
        nowParts.month,
        nowParts.day,
        -13
      );
      endDate = endOfZonedDay(end.year, end.month, end.day, timezone);
      startDate = startOfZonedDay(start.year, start.month, start.day, timezone);
      label = "Previous 7 days";
      break;
    }
    case "this_month":
      startDate = startOfZonedDay(nowParts.year, nowParts.month, 1, timezone);
      label = "This month";
      break;
    case "last_month": {
      const month = nowParts.month === 1 ? 12 : nowParts.month - 1;
      const year = nowParts.month === 1 ? nowParts.year - 1 : nowParts.year;
      startDate = startOfZonedDay(year, month, 1, timezone);
      endDate = endOfZonedDay(year, month, daysInMonth(year, month), timezone);
      label = "Last month";
      break;
    }
    case "last_30_days": {
      const start = addDaysToParts(
        nowParts.year,
        nowParts.month,
        nowParts.day,
        -29
      );
      startDate = startOfZonedDay(start.year, start.month, start.day, timezone);
      label = "Last 30 days";
      break;
    }
    case "last_90_days": {
      const start = addDaysToParts(
        nowParts.year,
        nowParts.month,
        nowParts.day,
        -89
      );
      startDate = startOfZonedDay(start.year, start.month, start.day, timezone);
      label = "Last 90 days";
      break;
    }
    case "this_year":
      startDate = startOfZonedDay(nowParts.year, 1, 1, timezone);
      label = "This year";
      break;
    case "last_year": {
      const year = nowParts.year - 1;
      startDate = startOfZonedDay(year, 1, 1, timezone);
      endDate = endOfZonedDay(year, 12, 31, timezone);
      label = "Last year";
      break;
    }
    case "rolling_12_months": {
      const startMonth = nowParts.month;
      const startYear = nowParts.year - 1;
      startDate = startOfZonedDay(
        startYear,
        startMonth,
        nowParts.day,
        timezone
      );
      label = "Rolling last 12 months";
      break;
    }
    default:
      startDate = startOfZonedDay(nowParts.year, nowParts.month, 1, timezone);
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

export function formatPeriodDateRange(
  startDate: Date,
  endDate: Date,
  timezone: string
): string {
  return `${formatYmdInZone(startDate, timezone)} – ${formatYmdInZone(endDate, timezone)}`;
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
