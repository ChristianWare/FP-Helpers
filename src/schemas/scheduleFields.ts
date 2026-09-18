// schemas/scheduleFields.ts
//
// The "how often, and when?" fields, shared by the create-circle wizard and
// the schedule editor on the circle page so both validate identically.
import { z } from "zod";
import {
  computeScheduleKeys,
  isDateKey,
  resolveScheduleDays,
} from "@/lib/shifts/scheduleDates";

export const scheduleFieldShape = {
  // The three-way choice in the UI
  scheduleFrequency: z.enum(["DAILY", "ONE_DAY", "MULTIPLE_DAYS"]),
  // Used when scheduleFrequency === "ONE_DAY"
  rotationDayOfWeek: z.number().int().min(0).max(6),
  // Used when scheduleFrequency === "MULTIPLE_DAYS"
  rotationDaysOfWeek: z.array(z.number().int().min(0).max(6)).max(7),
  rotationCadence: z.enum(["WEEKLY", "BIWEEKLY"]),
  typicalArrivalTime: z.string().optional().or(z.literal("")),

  durationType: z.enum(["INDEFINITE", "FIXED"]),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
};

type ScheduleValues = {
  scheduleFrequency: "DAILY" | "ONE_DAY" | "MULTIPLE_DAYS";
  rotationDayOfWeek: number;
  rotationDaysOfWeek: number[];
  rotationCadence: "WEEKLY" | "BIWEEKLY";
  durationType: "INDEFINITE" | "FIXED";
  startDate?: string;
  endDate?: string;
};

/** Cross-field rules. Call from a .superRefine() on the full object. */
export function refineSchedule(data: ScheduleValues, ctx: z.RefinementCtx) {
  // ——— Duration ———
  const isFixed = data.durationType === "FIXED";
  const hasDates = isDateKey(data.startDate) && isDateKey(data.endDate);

  if (isFixed && !isDateKey(data.startDate)) {
    ctx.addIssue({
      code: "custom",
      message: "Pick a start date",
      path: ["startDate"],
    });
  }
  if (isFixed && !isDateKey(data.endDate)) {
    ctx.addIssue({
      code: "custom",
      message: "Pick an end date",
      path: ["endDate"],
    });
  }
  if (isFixed && hasDates && data.endDate! <= data.startDate!) {
    ctx.addIssue({
      code: "custom",
      message: "End date must be after start date",
      path: ["endDate"],
    });
  }

  // ——— Days ———
  if (
    data.scheduleFrequency === "MULTIPLE_DAYS" &&
    new Set(data.rotationDaysOfWeek).size < 2
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Pick at least two days — or choose “One day a week” instead",
      path: ["rotationDaysOfWeek"],
    });
    return;
  }

  // A set period has to contain at least one of the chosen days
  // (e.g. "Saturdays" between a Monday and that Thursday is zero visits).
  if (isFixed && hasDates && data.endDate! > data.startDate!) {
    const visits = computeScheduleKeys({
      days: resolveScheduleDays(data),
      cadence: "WEEKLY",
      fromKey: data.startDate!,
      untilKey: data.endDate!,
      maxCount: 1,
    });
    if (visits.length === 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "None of the days you picked fall between your start and end dates",
        path: ["scheduleFrequency"],
      });
    }
  }
}
