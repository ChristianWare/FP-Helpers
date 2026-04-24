// lib/shifts/generateShifts.ts
import { db } from "@/lib/db";
import { addDays, addWeeks, startOfDay } from "date-fns";

function nextDayOfWeek(fromDate: Date, targetDayOfWeek: number): Date {
  // Use UTC day to make this timezone-independent.
  // Without this, a server running in UTC vs the user's local timezone
  // can pick different days, causing shifts to appear one day off.
  const currentDay = fromDate.getUTCDay();
  const daysUntilTarget = (targetDayOfWeek - currentDay + 7) % 7;
  const result = addDays(fromDate, daysUntilTarget);
  // Store at noon UTC so the date stays on the correct calendar day
  // across all US timezones (noon UTC = 4am–8am US local).
  result.setUTCHours(12, 0, 0, 0);
  return result;
}

export async function ensureShiftsForCircle(
  circleId: string,
  lookaheadWeeks: number = 16,
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
  if (circle.status !== "ACTIVE") return 0; // don't generate for archived/paused circles

  const helpers = circle.memberships;
  if (helpers.length === 0) return 0;

  const today = startOfDay(new Date());
  const firstShiftDate = nextDayOfWeek(today, circle.rotationDayOfWeek);

  // Generate target dates for the next N weeks (or until endDate, whichever comes first)
  const targetDates: Date[] = [];
  for (let i = 0; i < lookaheadWeeks; i++) {
    const weekOffset = circle.rotationCadence === "BIWEEKLY" ? i * 2 : i;
    const candidateDate = addWeeks(firstShiftDate, weekOffset);

    // Clamp to endDate if this is a FIXED-duration circle
    if (
      circle.durationType === "FIXED" &&
      circle.endDate &&
      candidateDate > circle.endDate
    ) {
      break;
    }

    targetDates.push(candidateDate);
  }

  if (targetDates.length === 0) return 0;

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

  await db.shift.createMany({ data: toCreate });

  return toCreate.length;
}

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
