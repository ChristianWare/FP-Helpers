// lib/shifts/generateShifts.ts
import { db } from "@/lib/db";
import { normalizeRotation } from "@/lib/shifts/rotationOrder";
import {
  addDaysToKey,
  computeScheduleKeys,
  currentShiftDayKey,
  dateKeyToNoonUtc,
  firstOccurrenceKey,
  getCircleDays,
  shiftDayCutoff,
  toDateKey,
} from "@/lib/shifts/scheduleDates";

// How far ahead to keep shifts on the books.
const STANDARD_MAX_SHIFTS = 64; // daily rotation ≈ 9 weeks; weekly is capped by lookaheadWeeks
const MEAL_TRAIN_FIXED_MAX_DAYS = 180; // a fixed meal train shows its whole run up front
const MEAL_TRAIN_ONGOING_DAYS = 56; // an ongoing one keeps 8 weeks of days open

type CircleForSchedule = {
  id: string;
  circleType: "STANDARD" | "MEAL_TRAIN";
  rotationCadence: "WEEKLY" | "BIWEEKLY" | "CUSTOM";
  rotationDaysOfWeek: number[];
  rotationDayOfWeek: number;
  scheduleAnchorDate: Date | null;
  durationType: "INDEFINITE" | "FIXED";
  startDate: Date | null;
  endDate: Date | null;
};

const circleScheduleSelect = {
  id: true,
  status: true,
  circleType: true,
  rotationCadence: true,
  rotationDaysOfWeek: true,
  rotationDayOfWeek: true,
  scheduleAnchorDate: true,
  durationType: true,
  startDate: true,
  endDate: true,
} as const;

/**
 * The calendar days this circle should have a shift on, from today (or its
 * start date, whichever is later) out to the lookahead horizon (or its end
 * date, whichever is sooner — the end date itself is INCLUDED).
 */
async function computeTargetKeys(
  circle: CircleForSchedule,
  lookaheadWeeks: number,
): Promise<string[]> {
  const days = getCircleDays(circle);
  const isFixed = circle.durationType === "FIXED";
  const isMealTrain = circle.circleType === "MEAL_TRAIN";
  const biweekly = circle.rotationCadence === "BIWEEKLY";

  // Start: never before today, never before the circle's start date.
  const todayKey = currentShiftDayKey();
  const startKey =
    isFixed && circle.startDate ? toDateKey(circle.startDate) : null;
  const fromKey = startKey && startKey > todayKey ? startKey : todayKey;

  // End: the horizon, clamped to the end date.
  let horizonDays: number;
  let maxCount: number;
  if (isMealTrain) {
    horizonDays = isFixed ? MEAL_TRAIN_FIXED_MAX_DAYS : MEAL_TRAIN_ONGOING_DAYS;
    maxCount = MEAL_TRAIN_FIXED_MAX_DAYS;
  } else {
    horizonDays = lookaheadWeeks * 7 * (biweekly ? 2 : 1);
    maxCount = STANDARD_MAX_SHIFTS;
  }

  let untilKey = addDaysToKey(fromKey, horizonDays - 1);
  const endKey = isFixed && circle.endDate ? toDateKey(circle.endDate) : null;
  if (endKey && endKey < untilKey) untilKey = endKey;
  if (untilKey < fromKey) return [];

  // Biweekly circles need a fixed anchor so the on/off weeks never drift.
  let anchorKey: string | null = null;
  if (biweekly) {
    anchorKey = circle.scheduleAnchorDate
      ? toDateKey(circle.scheduleAnchorDate)
      : await resolveAndStoreAnchor(circle.id, days, fromKey);
  }

  return computeScheduleKeys({
    days,
    cadence: circle.rotationCadence,
    fromKey,
    untilKey,
    anchorKey,
    maxCount,
  });
}

/**
 * Older biweekly circles have no stored anchor. Adopt the week of their next
 * existing shift (so their current pattern is preserved), or the next
 * occurrence if they have none — then save it so it never moves again.
 */
async function resolveAndStoreAnchor(
  circleId: string,
  days: number[],
  fromKey: string,
): Promise<string> {
  const nextShift = await db.shift.findFirst({
    where: {
      circleId,
      scheduledDate: { gt: shiftDayCutoff() },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    orderBy: { scheduledDate: "asc" },
    select: { scheduledDate: true },
  });

  const anchorKey = nextShift
    ? toDateKey(nextShift.scheduledDate)
    : firstOccurrenceKey(days, fromKey);

  await db.careCircle.update({
    where: { id: circleId },
    data: { scheduleAnchorDate: dateKeyToNoonUtc(anchorKey) },
  });

  return anchorKey;
}

/**
 * Make sure every scheduled day in the lookahead window has a shift.
 * Only ever ADDS shifts — never edits or removes existing ones.
 *
 *   STANDARD   → new shifts are assigned round-robin through the rotation.
 *   MEAL_TRAIN → new shifts are created unassigned: open days for helpers
 *                to claim.
 */
export async function ensureShiftsForCircle(
  circleId: string,
  lookaheadWeeks: number = 16,
): Promise<number> {
  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    select: {
      ...circleScheduleSelect,
      memberships: {
        where: {
          active: true,
          inRotation: true,
          role: { in: ["ADMIN", "HELPER"] },
        },
        orderBy: { rotationOrder: "asc" },
        select: { userId: true },
      },
    },
  });

  if (!circle) return 0;
  if (circle.status !== "ACTIVE") return 0; // don't generate for archived/paused circles

  const isMealTrain = circle.circleType === "MEAL_TRAIN";
  const helpers = circle.memberships;

  // A rotation needs someone in it. A meal train doesn't — its days start open.
  if (!isMealTrain && helpers.length === 0) return 0;

  const targetKeys = await computeTargetKeys(circle, lookaheadWeeks);
  if (targetKeys.length === 0) return 0;

  const firstKey = targetKeys[0];
  const lastKey = targetKeys[targetKeys.length - 1];

  // Any shift already on a target day — whatever its status — means that day
  // is handled. (A CANCELLED shift stays cancelled; we don't resurrect it.)
  const existingShifts = await db.shift.findMany({
    where: {
      circleId,
      scheduledDate: {
        gte: new Date(`${firstKey}T00:00:00.000Z`),
        lte: new Date(`${lastKey}T23:59:59.999Z`),
      },
    },
    select: {
      scheduledDate: true,
      assignedUserId: true,
      originalAssignedUserId: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  const existingKeys = new Set(
    existingShifts.map((s) => toDateKey(s.scheduledDate)),
  );
  const missingKeys = targetKeys.filter((key) => !existingKeys.has(key));
  if (missingKeys.length === 0) return 0;

  // ——— Meal train: open days ———
  if (isMealTrain) {
    await db.shift.createMany({
      data: missingKeys.map((key) => ({
        circleId,
        scheduledDate: dateKeyToNoonUtc(key),
        status: "SCHEDULED" as const,
      })),
    });
    return missingKeys.length;
  }

  // ——— Standard: continue the round-robin from whoever went last ———
  // "Whoever went last" means whose TURN it was (originalAssignedUserId) —
  // if that date was covered by someone else through a swap request, the
  // rotation still continues from the person whose turn it was.
  let rotationIndex = 0;
  const lastShift =
    existingShifts.length > 0
      ? existingShifts[existingShifts.length - 1]
      : await db.shift.findFirst({
          // Window is empty (e.g. the schedule just changed and the future
          // shifts were wiped) — pick up after the most recent past shift
          // instead of restarting at the top of the roster.
          where: {
            circleId,
            scheduledDate: { lt: dateKeyToNoonUtc(firstKey) },
          },
          orderBy: { scheduledDate: "desc" },
          select: { assignedUserId: true, originalAssignedUserId: true },
        });
  const lastAssigned =
    lastShift?.originalAssignedUserId ?? lastShift?.assignedUserId ?? null;

  if (lastAssigned) {
    const lastIdx = helpers.findIndex((h) => h.userId === lastAssigned);
    if (lastIdx >= 0) rotationIndex = (lastIdx + 1) % helpers.length;
  }

  const toCreate = missingKeys.map((key) => {
    const helper = helpers[rotationIndex % helpers.length];
    rotationIndex++;
    return {
      circleId,
      scheduledDate: dateKeyToNoonUtc(key),
      assignedUserId: helper.userId,
      originalAssignedUserId: helper.userId,
      status: "SCHEDULED" as const,
    };
  });

  await db.shift.createMany({ data: toCreate });
  return toCreate.length;
}

/**
 * Bring the upcoming shifts in line with the rotation after the roster
 * changes (someone joined). STANDARD circles only — in a meal train people
 * chose their days, and nothing is ever allowed to reshuffle them.
 *
 * This used to restart the rotation from the top of the roster at the next
 * upcoming date, which could hand someone two turns in a row and move
 * everyone's dates whenever a helper joined. It now keeps the order people
 * are already due to serve in and adds the new helper at the END — nobody's
 * upcoming date moves. (See lib/shifts/rotationOrder.ts.)
 */
export async function rebalanceShiftsForCircle(
  circleId: string,
): Promise<number> {
  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    select: { circleType: true },
  });
  if (!circle || circle.circleType === "MEAL_TRAIN") return 0;

  return normalizeRotation(circleId);
}

/**
 * MEAL_TRAIN schedule edits. Unlike a rotation (where we wipe and regenerate),
 * a meal train's days belong to the people who claimed them, so this is a
 * careful diff:
 *   • open days that no longer fit the schedule are removed
 *   • CLAIMED days are always kept, even if they're now off-pattern
 *   • missing days are added as open slots
 */
export async function syncMealTrainSlots(circleId: string): Promise<{
  removed: number;
  created: number;
  claimedOutsideSchedule: number;
}> {
  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    select: circleScheduleSelect,
  });

  if (!circle || circle.circleType !== "MEAL_TRAIN") {
    return { removed: 0, created: 0, claimedOutsideSchedule: 0 };
  }

  const targetKeys = new Set(await computeTargetKeys(circle, 16));

  const upcoming = await db.shift.findMany({
    where: {
      circleId,
      scheduledDate: { gt: shiftDayCutoff() },
      status: "SCHEDULED",
    },
    select: { id: true, scheduledDate: true, assignedUserId: true },
  });

  const offSchedule = upcoming.filter(
    (s) => !targetKeys.has(toDateKey(s.scheduledDate)),
  );
  const openToRemove = offSchedule
    .filter((s) => !s.assignedUserId)
    .map((s) => s.id);
  const claimedOutsideSchedule = offSchedule.length - openToRemove.length;

  if (openToRemove.length > 0) {
    await db.shift.deleteMany({
      // Re-check "unassigned" in the WHERE so a day claimed a moment ago survives.
      where: {
        id: { in: openToRemove },
        assignedUserId: null,
        status: "SCHEDULED",
      },
    });
  }

  const created = await ensureShiftsForCircle(circleId);

  return { removed: openToRemove.length, created, claimedOutsideSchedule };
}
