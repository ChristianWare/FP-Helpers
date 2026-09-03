// actions/circles/updateCircleSchedule.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import {
  UpdateCircleScheduleSchema,
  UpdateCircleScheduleSchemaType,
} from "@/schemas/UpdateCircleScheduleSchema";
import { ensureShiftsForCircle } from "@/lib/shifts/generateShifts";
import { revalidatePath } from "next/cache";

export async function updateCircleSchedule(
  circleId: string,
  values: UpdateCircleScheduleSchemaType,
) {
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
      rotationDayOfWeek: true,
      rotationCadence: true,
      durationType: true,
      endDate: true,
    },
  });

  if (!existing) {
    return { success: false, error: "Circle not found" };
  }

  const {
    rotationDayOfWeek,
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

  await db.careCircle.update({
    where: { id: circleId },
    data: {
      rotationDayOfWeek,
      rotationCadence,
      typicalArrivalTime: typicalArrivalTime?.trim() || null,
      address: address?.trim() || null,
      addressCity: addressCity?.trim() || null,
      addressState: addressState?.trim() || null,
      addressZip: addressZip?.trim() || null,
      accessNotes: accessNotes?.trim() || null,
      durationType,
      startDate:
        durationType === "FIXED" && startDate ? new Date(startDate) : null,
      endDate: durationType === "FIXED" && endDate ? new Date(endDate) : null,
    },
  });

  // If rotation day/cadence or end date changed, regenerate future shifts
  const scheduleChanged =
    existing.rotationDayOfWeek !== rotationDayOfWeek ||
    existing.rotationCadence !== rotationCadence ||
    existing.durationType !== durationType ||
    (durationType === "FIXED" &&
      endDate &&
      existing.endDate?.toISOString().split("T")[0] !== endDate);

  if (scheduleChanged) {
    try {
      // Remove future shifts generated under the old schedule before
      // regenerating, otherwise stale old-day shifts linger alongside
      // the new ones. Past history is untouched: the date filter keeps
      // anything already in the past, and the status filter preserves
      // COMPLETED / MISSED / IN_PROGRESS / CANCELLED rows. Child records
      // (grocery items, pickups, receipts, swap requests, events)
      // cascade-delete with the shift; NotificationLog rows set-null.
      await db.shift.deleteMany({
        where: {
          circleId,
          scheduledDate: { gte: new Date() },
          status: { in: ["SCHEDULED", "SWAPPED"] },
        },
      });

      await ensureShiftsForCircle(circleId);
    } catch (err) {
      console.error("[updateCircleSchedule] Failed to regenerate shifts:", err);
    }
  }

  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-circle");

  return { success: true };
}
