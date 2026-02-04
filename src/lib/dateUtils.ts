/**
 * Centralized date utilities for robust parsing of Postgres timestamps
 * and consistent local date comparisons.
 *
 * Handles formats like:
 * - "2026-02-04 14:41:29.882+00" (Postgres timestamptz with space and short offset)
 * - "2026-02-04T14:41:29.882Z" (ISO)
 * - "2026-02-04" (date-only)
 */

import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isSameDay,
} from "date-fns";

/**
 * Normalizes a Postgres timestamp string to a format that JS Date can parse correctly.
 * - Replaces space with "T" for ISO compatibility
 * - Adds ":00" to short timezone offsets ("+00" -> "+00:00")
 */
function normalizePostgresTimestamp(raw: string): string {
  let v = raw.trim();

  // "2026-02-04 14:41:29" → "2026-02-04T14:41:29"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)) {
    v = v.replace(" ", "T");
  }

  // "+00" → "+00:00" (offset without minutes)
  if (/[+-]\d{2}$/.test(v)) {
    v = v.replace(/([+-]\d{2})$/, "$1:00");
  }

  return v;
}

/**
 * Parses any timestamp or date string from the database into a local Date object.
 * Returns null if the value is null, empty, or unparseable.
 */
export function parseToLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // If it's already date-only (YYYY-MM-DD), treat as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed + "T00:00:00");
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Normalize and parse timestamp
  const normalized = normalizePostgresTimestamp(trimmed);
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Converts any timestamp or date string to a local date string (YYYY-MM-DD).
 * Returns null if unparseable.
 */
export function toLocalDateString(value: string | null | undefined): string | null {
  const date = parseToLocalDate(value);
  if (!date) return null;
  return format(date, "yyyy-MM-dd");
}

/**
 * Checks if a timestamp corresponds to today in the local timezone.
 */
export function isToday(value: string | null | undefined): boolean {
  const date = parseToLocalDate(value);
  if (!date) return false;
  return isSameDay(date, new Date());
}

/**
 * Type for date range filter options.
 */
export type DateRangeFilter = "all" | "today" | "week" | "month" | "overdue" | "custom";

/**
 * Checks if a date string falls within a given date range filter.
 * For "custom" range, provide customStart and customEnd.
 */
export function isInDateRange(
  dateValue: string | null | undefined,
  range: DateRangeFilter | string,
  customStart?: Date,
  customEnd?: Date
): boolean {
  if (!dateValue || range === "all") return true;

  const localDateStr = toLocalDateString(dateValue);
  if (!localDateStr) return false;

  // Create date at local midnight for comparison
  const date = new Date(localDateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (range) {
    case "today":
      return isSameDay(date, today);

    case "week":
      return isWithinInterval(date, {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      });

    case "month":
      return isWithinInterval(date, {
        start: startOfMonth(today),
        end: endOfMonth(today),
      });

    case "overdue":
      return date < today;

    case "custom":
      if (!customStart && !customEnd) return true;
      if (customStart && customEnd) {
        return isWithinInterval(date, {
          start: startOfDay(customStart),
          end: endOfDay(customEnd),
        });
      }
      if (customStart) {
        return date >= startOfDay(customStart);
      }
      if (customEnd) {
        return date <= endOfDay(customEnd);
      }
      return true;

    default:
      return true;
  }
}

/**
 * Formats a date or timestamp for display, with friendly labels.
 * Returns "Hoje", "Amanhã", "Ontem", or a formatted date string.
 */
export function formatDateFriendly(
  value: string | null | undefined,
  options?: { includeTime?: boolean }
): string | null {
  const date = parseToLocalDate(value);
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;

  if (dateOnly.getTime() === today.getTime()) {
    label = "Hoje";
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    label = "Amanhã";
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    label = "Ontem";
  } else {
    label = format(date, "dd 'de' MMMM 'de' yyyy");
  }

  if (options?.includeTime) {
    const time = format(date, "HH:mm");
    return `${label} às ${time}`;
  }

  return label;
}

/**
 * Checks if a date is overdue (before today) and not completed.
 */
export function isOverdue(
  dateValue: string | null | undefined,
  completed: boolean
): boolean {
  if (!dateValue || completed) return false;

  const localDateStr = toLocalDateString(dateValue);
  if (!localDateStr) return false;

  const date = new Date(localDateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today;
}
