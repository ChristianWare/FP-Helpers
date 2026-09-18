// lib/shifts/reminderDays.ts
import { getCircleDays, visitsPerWeek } from "@/lib/shifts/scheduleDates";

export type ReminderDay = 7 | 2 | 1;

type CircleForReminders = {
  circleType: "STANDARD" | "MEAL_TRAIN";
  rotationCadence: "WEEKLY" | "BIWEEKLY" | "CUSTOM";
  rotationDaysOfWeek: number[];
  rotationDayOfWeek: number;
  reminderDaysBefore: number[];
};

/**
 * Which "days before" reminders a circle actually sends.
 *
 * The default is 7, 2 and 1 days before. That's right for a weekly rotation,
 * but in a rotation that runs 3+ days a week the same few helpers come up
 * every few days — three emails per shift would mean an email almost daily.
 * Those circles get the day-before reminder only.
 *
 * Meal trains keep the full set: most people sign up for a day or two, and
 * the week-ahead heads-up is useful for planning a meal.
 */
export function effectiveReminderDays(
  circle: CircleForReminders,
): ReminderDay[] {
  const configured = circle.reminderDaysBefore.filter(
    (d): d is ReminderDay => d === 7 || d === 2 || d === 1,
  );

  const highFrequency =
    circle.circleType === "STANDARD" &&
    visitsPerWeek(getCircleDays(circle), circle.rotationCadence) >= 3;

  if (!highFrequency) return configured;
  return configured.includes(1) ? [1] : configured.slice(-1);
}

/** "7 days, 2 days, and 1 day" · "the day" — for UI copy. */
export function describeReminderDays(days: ReminderDay[]): string {
  if (days.length === 0) return "";
  const parts = days.map((d) => (d === 1 ? "1 day" : `${d} days`));
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}
