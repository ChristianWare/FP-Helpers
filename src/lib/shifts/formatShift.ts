// lib/shifts/formatShift.ts
import {
  format,
  isToday,
  isTomorrow,
  differenceInCalendarDays,
} from "date-fns";

/**
 * Returns a friendly label for a shift date relative to today.
 * Examples: "Today", "Tomorrow", "This Saturday", "Sat, May 3"
 */
export function formatShiftDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shiftDay = new Date(date);
  shiftDay.setHours(0, 0, 0, 0);

  if (isToday(shiftDay)) return "Today";
  if (isTomorrow(shiftDay)) return "Tomorrow";

  const daysUntil = differenceInCalendarDays(shiftDay, today);

  // Within the current week → "This Saturday"
  if (daysUntil > 0 && daysUntil <= 6) {
    return `This ${format(shiftDay, "EEEE")}`;
  }

  // Next week → "Next Saturday"
  if (daysUntil > 6 && daysUntil <= 13) {
    return `Next ${format(shiftDay, "EEEE")}`;
  }

  // Otherwise → "Sat, May 3"
  return format(shiftDay, "EEE, MMM d");
}

/**
 * Returns a full date display: "Saturday, April 25"
 */
export function formatShiftFullDate(date: Date): string {
  return format(new Date(date), "EEEE, MMMM d");
}

/**
 * Day of week as label: "Saturdays", "Sundays", etc.
 */
export function formatRotationDay(dayOfWeek: number): string {
  const days = [
    "Sundays",
    "Mondays",
    "Tuesdays",
    "Wednesdays",
    "Thursdays",
    "Fridays",
    "Saturdays",
  ];
  return days[dayOfWeek] ?? "Saturdays";
}

/**
 * Frequency display: "Weekly" | "Every other week"
 */
export function formatCadence(
  cadence: "WEEKLY" | "BIWEEKLY" | "CUSTOM",
): string {
  if (cadence === "BIWEEKLY") return "Every other week";
  if (cadence === "CUSTOM") return "Custom schedule";
  return "Weekly";
}
