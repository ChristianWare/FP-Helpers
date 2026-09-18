// actions/circles/updateCircleSchedule.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import {
  UpdateCircleScheduleSchema,
  UpdateCircleScheduleSchemaType,
} from "@/schemas/UpdateCircleScheduleSchema";
import {
  ensureShiftsForCircle,
  syncMealTrainSlots,
} from "@/lib/shifts/generateShifts";
import { getNextShiftForCircle } from "@/lib/shifts/getNextShift";
import {
  currentShiftDayKey,
  dateInputToEnd,
  dateInputToStart,
  dateKeyToNoonUtc,
  firstOccurrenceKey,
  getCircleDays,
  resolveScheduleDays,
  shiftDayCutoff,
  toDateKey,
} from "@/lib/shifts/scheduleDates";
import { revalidatePath } from "next/cache";

export async function updateCircleSchedule(
  circleId: string,
  values: UpdateCircleScheduleSchemaType,
): Promise<{ success: boolean; error?: string; notice?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not signed in" };
  }

  const validated = UpdateCircleScheduleSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid fields",
    };
  }

  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: {
        userId: session.user.id,
        circleId,
      },
    },
    select: { role: true },
  });

  const isAdmin = membership?.role === "ADMIN";
  if (!isAdmin && !session.user.isSuperAdmin) {
    return {
      success: false,
      error: "Only admins can edit circle schedule",
    };
  }

  // Check existing circle values so we know if schedule-affecting fields changed
  const existing = await db.careCircle.findUnique({
    where: { id: circleId },
    select: {
      circleType: true,
      rotationDaysOfWeek: true,
      rotationDayOfWeek: true,
      rotationCadence: true,
      durationType: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!existing) {
    return { success: false, error: "Circle not found" };
  }

  const {
    rotationCadence,
    typicalArrivalTime,
    address,
    addressCity,
    addressState,
    addressZip,
    accessNotes,
    durationType,
    startDate,
    endDate,
  } = validated.data;

  const rotationDaysOfWeek = resolveScheduleDays(validated.data);
  if (rotationDaysOfWeek.length === 0) {
    return {
      success: false,
      error: "Please pick at least one day of the week",
    };
  }

  const isFixed = durationType === "FIXED";

  // ——— What changed? ———
  const daysChanged =
    getCircleDays(existing).join(",") !== rotationDaysOfWeek.join(",");
  const cadenceChanged = existing.rotationCadence !== rotationCadence;
  const dateKeyOf = (d: Date | null) => (d ? toDateKey(d) : "");
  const datesChanged =
    existing.durationType !== durationType ||
    (isFixed &&
      (dateKeyOf(existing.startDate) !== (startDate ?? "") ||
        dateKeyOf(existing.endDate) !== (endDate ?? "")));

  const scheduleChanged = daysChanged || cadenceChanged || datesChanged;

  // A new day/cadence pattern starts fresh from its next occurrence.
  let scheduleAnchorDate: Date | undefined;
  if (daysChanged || cadenceChanged) {
    const todayKey = currentShiftDayKey();
    const fromKey =
      isFixed && startDate && startDate > todayKey ? startDate : todayKey;
    scheduleAnchorDate = dateKeyToNoonUtc(
      firstOccurrenceKey(rotationDaysOfWeek, fromKey),
    );
  }

  await db.careCircle.update({
    where: { id: circleId },
    data: {
      rotationDaysOfWeek,
      rotationDayOfWeek: rotationDaysOfWeek[0], // legacy column, kept in sync
      rotationCadence,
      ...(scheduleAnchorDate ? { scheduleAnchorDate } : {}),
      typicalArrivalTime: typicalArrivalTime?.trim() || null,
      address: address?.trim() || null,
      addressCity: addressCity?.trim() || null,
      addressState: addressState?.trim() || null,
      addressZip: addressZip?.trim() || null,
      accessNotes: accessNotes?.trim() || null,
      durationType,
      startDate: isFixed && startDate ? dateInputToStart(startDate) : null,
      endDate: isFixed && endDate ? dateInputToEnd(endDate) : null,
    },
  });

  let notice: string | undefined;

  if (scheduleChanged) {
    try {
      if (existing.circleType === "MEAL_TRAIN") {
        // ——— Meal train: a careful diff ———
        // People chose these days and said what they're cooking. We only
        // add/remove OPEN days; anything someone has claimed is never touched.
        const sync = await syncMealTrainSlots(circleId);
        if (sync.claimedOutsideSchedule > 0) {
          const n = sync.claimedOutsideSchedule;
          notice = `${n} ${n === 1 ? "day that someone signed up for falls" : "days that people signed up for fall"} outside the new schedule. We kept ${n === 1 ? "it" : "them"} — release ${n === 1 ? "it" : "them"} from the calendar if ${n === 1 ? "it's" : "they're"} no longer needed.`;
        }
      } else {
        // ——— Rotation: wipe the future and re-deal ———
        // Remove future shifts generated under the old schedule before
        // regenerating, otherwise stale old-day shifts linger alongside
        // the new ones. Past history is untouched: the date filter keeps
        // anything already in the past, and the status filter preserves
        // COMPLETED / MISSED / IN_PROGRESS / CANCELLED rows.
        const doomed = await db.shift.findMany({
          where: {
            circleId,
            scheduledDate: { gt: shiftDayCutoff() },
            status: { in: ["SCHEDULED", "SWAPPED"] },
          },
          select: { id: true },
        });
        const doomedIds = doomed.map((s) => s.id);

        // Grocery items don't cascade with a shift — they're set to "no
        // shift", which drops them into "Saved for later". Remember which
        // pending items were riding on these shifts so we can re-attach them.
        const strandedItems = await db.groceryItem.findMany({
          where: {
            circleId,
            assignedShiftId: { in: doomedIds },
            status: { in: ["PENDING", "ASSIGNED"] },
          },
          select: { id: true },
        });

        await db.shift.deleteMany({ where: { id: { in: doomedIds } } });

        await ensureShiftsForCircle(circleId);

        if (strandedItems.length > 0) {
          const nextShift = await getNextShiftForCircle(circleId);
          if (nextShift) {
            await db.groceryItem.updateMany({
              where: { id: { in: strandedItems.map((i) => i.id) } },
              data: { assignedShiftId: nextShift.id },
            });
          }
        }
      }
    } catch (err) {
      console.error("[updateCircleSchedule] Failed to regenerate shifts:", err);
    }
  }

  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-circle");

  return { success: true, notice };
}
