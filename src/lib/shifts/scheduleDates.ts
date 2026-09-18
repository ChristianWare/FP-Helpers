// lib/shifts/scheduleDates.ts
//
// Pure schedule + date helpers. NO database imports in here — this file is
// used by the create-circle wizard in the browser (for the live "that's 7
// visits" count) as well as by the shift generator on the server.
//
// Conventions used across the app:
//   • A "date key" is a plain calendar day: "2026-10-07".
//   • A shift is stored at 12:00 UTC on its calendar day, so it lands on the
//     same date in every US timezone (noon UTC = 4am–8am US local).
//   • Days of week are 0 = Sunday … 6 = Saturday.

export type Cadence = "WEEKLY" | "BIWEEKLY" | "CUSTOM";
export type ScheduleFrequency = "DAILY" | "ONE_DAY" | "MULTIPLE_DAYS";

export const ALL_DAYS: number[] = [0, 1, 2, 3, 4, 5, 6];

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_NAMES_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────
// Days of the week
// ─────────────────────────────────────────────

/** Sorted, de-duplicated, valid (0–6) days. */
export function normalizeDays(
  days: readonly number[] | null | undefined,
): number[] {
  if (!days) return [];
  const valid = days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return Array.from(new Set(valid)).sort((a, b) => a - b);
}

/**
 * The days a circle runs on. Falls back to the legacy single-day column for
 * rows created before rotationDaysOfWeek existed (their array is empty).
 */
export function getCircleDays(circle: {
  rotationDaysOfWeek?: readonly number[] | null;
  rotationDayOfWeek: number;
}): number[] {
  const days = normalizeDays(circle.rotationDaysOfWeek);
  if (days.length > 0) return days;
  return normalizeDays([circle.rotationDayOfWeek]);
}

/** Which of the three wizard options a set of days corresponds to. */
export function frequencyForDays(days: readonly number[]): ScheduleFrequency {
  const n = normalizeDays(days).length;
  if (n >= 7) return "DAILY";
  if (n <= 1) return "ONE_DAY";
  return "MULTIPLE_DAYS";
}

/** Turns the wizard's three-way choice into the stored days array. */
export function resolveScheduleDays(input: {
  scheduleFrequency: ScheduleFrequency;
  rotationDayOfWeek: number;
  rotationDaysOfWeek: readonly number[];
}): number[] {
  if (input.scheduleFrequency === "DAILY") return [...ALL_DAYS];
  if (input.scheduleFrequency === "ONE_DAY") {
    return normalizeDays([input.rotationDayOfWeek]);
  }
  return normalizeDays(input.rotationDaysOfWeek);
}

/** Average visits per week: Wed + Sat weekly = 2, Saturdays biweekly = 0.5. */
export function visitsPerWeek(
  days: readonly number[],
  cadence: Cadence,
): number {
  const n = normalizeDays(days).length;
  return cadence === "BIWEEKLY" ? n / 2 : n;
}

// ─────────────────────────────────────────────
// Date keys
// ─────────────────────────────────────────────

/** "2026-10-07" for a Date, read in UTC. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-10-07" from the browser's LOCAL calendar — for <input type="date">. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** The instant a shift on this calendar day is stored at: 12:00 UTC. */
export function dateKeyToNoonUtc(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

export function addDaysToKey(key: string, days: number): string {
  return toDateKey(
    new Date(dateKeyToNoonUtc(key).getTime() + days * MS_PER_DAY),
  );
}

export function dayOfWeekForKey(key: string): number {
  return dateKeyToNoonUtc(key).getUTCDay();
}

/** Whole days from a → b (negative if b is earlier). */
export function daysBetweenKeys(a: string, b: string): number {
  return Math.round(
    (dateKeyToNoonUtc(b).getTime() - dateKeyToNoonUtc(a).getTime()) /
      MS_PER_DAY,
  );
}

/** Index of the Sunday-to-Saturday week a date falls in (for biweekly parity). */
function weekIndexForKey(key: string): number {
  const daysSinceEpoch = Math.floor(
    dateKeyToNoonUtc(key).getTime() / MS_PER_DAY,
  );
  // 1970-01-01 was a Thursday (4), so shifting by 4 makes weeks start on Sunday.
  return Math.floor((daysSinceEpoch + 4) / 7);
}

// ─────────────────────────────────────────────
// Start / end dates of a FIXED circle
// ─────────────────────────────────────────────

/** Stored value for a start date picked in a date input. */
export function dateInputToStart(value: string): Date {
  return dateKeyToNoonUtc(value);
}

/**
 * Stored value for an end date picked in a date input: the very END of that
 * day, so the last day is INCLUDED in the schedule and the circle isn't
 * archived until that day is over.
 */
export function dateInputToEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

// ─────────────────────────────────────────────
// "Today" for shifts
// ─────────────────────────────────────────────
//
// The server runs in UTC, but everyone using the app is in a US timezone. At
// 6pm in Phoenix it's already tomorrow in UTC — and a helper delivering dinner
// at 6pm shouldn't see today's shift vanish. So "today" rolls over at 08:00
// UTC (midnight Pacific / 1am Phoenix / 3–4am Eastern) instead of 00:00 UTC.

const DAY_ROLLOVER_HOURS_UTC = 8;

/** The current calendar day for scheduling purposes, as a date key. */
export function currentShiftDayKey(now: Date = new Date()): string {
  return toDateKey(
    new Date(now.getTime() - DAY_ROLLOVER_HOURS_UTC * 60 * 60 * 1000),
  );
}

/**
 * Query cutoff: a shift is still "today or upcoming" when
 *   scheduledDate > shiftDayCutoff()
 * (Shifts sit at 12:00 UTC, so this is the same rollover as above.)
 */
export function shiftDayCutoff(now: Date = new Date()): Date {
  return new Date(
    now.getTime() - (12 + DAY_ROLLOVER_HOURS_UTC) * 60 * 60 * 1000,
  );
}

/** 00:00 UTC of the current shift day — used to decide when a circle has ended. */
export function currentShiftDayStart(now: Date = new Date()): Date {
  return new Date(`${currentShiftDayKey(now)}T00:00:00.000Z`);
}

// ─────────────────────────────────────────────
// Generating the dates
// ─────────────────────────────────────────────

/** First date on/after `fromKey` that falls on one of `days`. */
export function firstOccurrenceKey(
  days: readonly number[],
  fromKey: string,
): string {
  const wanted = new Set(normalizeDays(days));
  if (wanted.size === 0) return fromKey;
  let key = fromKey;
  for (let i = 0; i < 7; i++) {
    if (wanted.has(dayOfWeekForKey(key))) return key;
    key = addDaysToKey(key, 1);
  }
  return fromKey;
}

type ComputeInput = {
  days: readonly number[];
  cadence: Cadence;
  /** First calendar day to consider (inclusive). */
  fromKey: string;
  /** Last calendar day to consider (INCLUSIVE). */
  untilKey: string;
  /**
   * BIWEEKLY only: any date in an "on" week. Weeks with the same parity are
   * on, the others are skipped. Defaults to the first occurrence from fromKey.
   */
  anchorKey?: string | null;
  /** Safety cap on how many dates to return. */
  maxCount?: number;
};

/** Every scheduled calendar day between fromKey and untilKey, inclusive. */
export function computeScheduleKeys({
  days,
  cadence,
  fromKey,
  untilKey,
  anchorKey,
  maxCount = 400,
}: ComputeInput): string[] {
  const wanted = new Set(normalizeDays(days));
  if (wanted.size === 0 || untilKey < fromKey) return [];

  const biweekly = cadence === "BIWEEKLY";
  const anchorWeek = biweekly
    ? weekIndexForKey(anchorKey ?? firstOccurrenceKey(days, fromKey))
    : 0;

  const keys: string[] = [];
  const span = Math.min(daysBetweenKeys(fromKey, untilKey), 1100);

  for (let i = 0; i <= span && keys.length < maxCount; i++) {
    const key = addDaysToKey(fromKey, i);
    if (!wanted.has(dayOfWeekForKey(key))) continue;
    if (biweekly && Math.abs(weekIndexForKey(key) - anchorWeek) % 2 !== 0)
      continue;
    keys.push(key);
  }

  return keys;
}

// ─────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────

function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function isWeekdaysOnly(days: number[]): boolean {
  return days.length === 5 && days.every((d, i) => d === i + 1);
}

/**
 * "Every Wednesday" · "Every other Saturday" · "Wednesdays and Saturdays" ·
 * "Weekdays (Mon–Fri)" · "Every day"
 */
export function describeSchedule(
  days: readonly number[],
  cadence: Cadence,
): string {
  const d = normalizeDays(days);
  const biweekly = cadence === "BIWEEKLY";
  if (d.length === 0) return "Not set";

  if (d.length === 1) {
    return `${biweekly ? "Every other" : "Every"} ${DAY_NAMES[d[0]]}`;
  }

  let base: string;
  if (d.length === 7) base = "Every day";
  else if (isWeekdaysOnly(d)) base = "Weekdays (Mon–Fri)";
  else base = joinWithAnd(d.map((day) => `${DAY_NAMES[day]}s`));

  return biweekly ? `${base}, every other week` : base;
}

/**
 * Just the days, with no cadence baked in — for places that show the
 * frequency on its own line: "Wednesdays" · "Wednesdays and Saturdays" ·
 * "Weekdays (Mon–Fri)" · "Every day"
 */
export function describeDays(days: readonly number[]): string {
  const d = normalizeDays(days);
  if (d.length === 0) return "Not set";
  if (d.length === 7) return "Every day";
  if (isWeekdaysOnly(d)) return "Weekdays (Mon–Fri)";
  return joinWithAnd(d.map((day) => `${DAY_NAMES[day]}s`));
}

/** Compact version for cards: "Daily" · "Mon–Fri" · "Wed" · "Wed, Sat" */
export function describeDaysShort(days: readonly number[]): string {
  const d = normalizeDays(days);
  if (d.length === 0) return "—";
  if (d.length === 7) return "Daily";
  if (isWeekdaysOnly(d)) return "Mon–Fri";
  return d.map((day) => DAY_NAMES_SHORT[day]).join(", ");
}

/** "Every week" · "Every other week" */
export function describeCadence(cadence: Cadence): string {
  return cadence === "BIWEEKLY" ? "Every other week" : "Every week";
}
