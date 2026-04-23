/* eslint-disable @typescript-eslint/no-unused-vars */
// lib/shifts/generateShifts.ts
import { db } from "@/lib/db";
import {
  addDays,
  addWeeks,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
} from "date-fns";

/**
 * Compute the date of the next occurrence of a given day of week (0 = Sunday, 6 = Saturday),
 * starting from `fromDate`. If fromDate IS that day of week, returns fromDate itself.
 */
function nextDayOfWeek(fromDate: Date, targetDayOfWeek: number): Date {
  const currentDay = fromDate.getDay();
  const daysUntilTarget = (targetDayOfWeek - currentDay + 7) % 7;
  const result = addDays(fromDate, daysUntilTarget);
  return startOfDay(result);
}

/**
 * Ensure a circle has scheduled shifts for the next N weeks (default 8).
 * Uses strict round-robin order based on CircleMembership.rotationOrder.
 * Idempotent: existing shifts are not duplicated.
 *
 * Returns the count of shifts created.
 */
export async function ensureShiftsForCircle(
  circleId: string,
  lookaheadWeeks: number = 8,
): Promise<number> {
  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    include: {
      memberships: {
        where: {
          active: true,
          inRotation: true,
          role: { in: ["ADMIN", "HELPER"] },
        },
        orderBy: { rotationOrder: "asc" },
        include: {
          user: { select: { id: true, firstName: true } },
        },
      },
    },
  });

  if (!circle) return 0;

  const helpers = circle.memberships;
  if (helpers.length === 0) {
    // No one in rotation — can't generate shifts
    return 0;
  }

  // Figure out the date window we need to fill
  const today = startOfDay(new Date());
  const firstShiftDate = nextDayOfWeek(today, circle.rotationDayOfWeek);

  // Generate target dates for the next N weeks
  const targetDates: Date[] = [];
  for (let i = 0; i < lookaheadWeeks; i++) {
    const weekOffset = circle.rotationCadence === "BIWEEKLY" ? i * 2 : i;
    targetDates.push(addWeeks(firstShiftDate, weekOffset));
  }

  // Fetch existing shifts in this window to avoid duplicates
  const existingShifts = await db.shift.findMany({
    where: {
      circleId,
      scheduledDate: {
        gte: targetDates[0],
        lte: addDays(targetDates[targetDates.length - 1], 1),
      },
    },
    select: { scheduledDate: true, assignedUserId: true },
    orderBy: { scheduledDate: "asc" },
  });

  const existingDateKeys = new Set(
    existingShifts.map((s) => s.scheduledDate.toISOString().split("T")[0]),
  );

  // Determine starting index in the rotation.
  // We look at the LAST existing shift (if any) and continue from the next helper.
  let rotationIndex = 0;
  if (existingShifts.length > 0) {
    const lastShift = existingShifts[existingShifts.length - 1];
    const lastAssignedIdx = helpers.findIndex(
      (h) => h.userId === lastShift.assignedUserId,
    );
    if (lastAssignedIdx >= 0) {
      rotationIndex = (lastAssignedIdx + 1) % helpers.length;
    }
  }

  // Build the list of shifts to create
  const toCreate: {
    circleId: string;
    scheduledDate: Date;
    assignedUserId: string;
    originalAssignedUserId: string;
    status: "SCHEDULED";
  }[] = [];

  for (const date of targetDates) {
    const dateKey = date.toISOString().split("T")[0];
    if (existingDateKeys.has(dateKey)) continue;

    const helper = helpers[rotationIndex % helpers.length];
    toCreate.push({
      circleId,
      scheduledDate: date,
      assignedUserId: helper.userId,
      originalAssignedUserId: helper.userId,
      status: "SCHEDULED",
    });
    rotationIndex++;
  }

  if (toCreate.length === 0) return 0;

  await db.shift.createMany({
    data: toCreate,
  });

  return toCreate.length;
}

/**
 * Reassigns all future SCHEDULED shifts to match the current rotation order.
 * Call this after adding or removing a helper so new shifts reflect the updated roster.
 * Does NOT touch completed, in-progress, missed, or swapped shifts — those stay
 * with whoever actually handled (or was supposed to handle) them.
 *
 * Returns the count of shifts that were updated.
 */
export async function rebalanceShiftsForCircle(
  circleId: string,
): Promise<number> {
  const memberships = await db.circleMembership.findMany({
    where: {
      circleId,
      active: true,
      inRotation: true,
      rotationOrder: { gte: 0 },
      role: { in: ["ADMIN", "HELPER"] },
    },
    orderBy: { rotationOrder: "asc" },
    select: { userId: true },
  });

  if (memberships.length === 0) return 0;

  const today = startOfDay(new Date());

  const shifts = await db.shift.findMany({
    where: {
      circleId,
      scheduledDate: { gte: today },
      status: "SCHEDULED",
    },
    orderBy: { scheduledDate: "asc" },
    select: { id: true, assignedUserId: true },
  });

  let updated = 0;
  for (let i = 0; i < shifts.length; i++) {
    const correctUserId = memberships[i % memberships.length].userId;
    if (shifts[i].assignedUserId !== correctUserId) {
      await db.shift.update({
        where: { id: shifts[i].id },
        data: {
          assignedUserId: correctUserId,
          originalAssignedUserId: correctUserId,
        },
      });
      updated++;
    }
  }

  return updated;
}
