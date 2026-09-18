// actions/meals/releaseSlot.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { sendMealDayReleasedEmails } from "@/lib/notifications/mealTrainEmails";
import { revalidatePath } from "next/cache";

type ReleaseSlotOutcome =
  { success: true; circleId: string } | { success: false; error: string };

/**
 * Give a claimed meal train day back so someone else can take it.
 * Allowed for the helper who holds the day, or a circle admin.
 * The day becomes an open slot again and the organizers are emailed.
 */
export async function releaseSlot(
  shiftId: string,
): Promise<ReleaseSlotOutcome> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }
  const actorId = session.user.id;

  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      circleId: true,
      status: true,
      scheduledDate: true,
      assignedUserId: true,
      circle: { select: { circleType: true } },
    },
  });

  if (!shift) return { success: false, error: "That day no longer exists" };
  if (shift.circle.circleType !== "MEAL_TRAIN") {
    return { success: false, error: "This circle doesn't use sign-ups" };
  }
  if (!shift.assignedUserId) {
    return { success: false, error: "That day is already open" };
  }
  if (shift.status !== "SCHEDULED") {
    return {
      success: false,
      error: "This day has already been delivered and can't be released",
    };
  }

  const releasedUserId = shift.assignedUserId;
  const isHolder = releasedUserId === actorId;

  if (!isHolder) {
    const membership = await db.circleMembership.findUnique({
      where: { userId_circleId: { userId: actorId, circleId: shift.circleId } },
      select: { role: true, active: true },
    });
    const isAdmin = membership?.active && membership.role === "ADMIN";
    if (!isAdmin && !session.user.isSuperAdmin) {
      return {
        success: false,
        error:
          "Only the person who signed up, or an organizer, can release a day",
      };
    }
  }

  // Guarded on the assignee we just read — if it changed under us, do nothing.
  const released = await db.$transaction(async (tx) => {
    const update = await tx.shift.updateMany({
      where: {
        id: shiftId,
        status: "SCHEDULED",
        assignedUserId: releasedUserId,
      },
      data: {
        assignedUserId: null,
        originalAssignedUserId: null,
        mealDescription: null,
        mealNotes: null,
      },
    });
    if (update.count === 0) return false;

    await tx.shiftEvent.create({
      data: {
        shiftId,
        type: "RELEASED",
        actorId,
        metadata: { releasedUserId, byOrganizer: !isHolder },
      },
    });
    return true;
  });

  if (!released) {
    return {
      success: false,
      error: "That day just changed — refresh and try again",
    };
  }

  await sendMealDayReleasedEmails({
    shiftId,
    circleId: shift.circleId,
    scheduledDate: shift.scheduledDate,
    releasedUserId,
    actorId,
  });

  revalidatePath(`/circles/${shift.circleId}`);
  revalidatePath(`/circles/${shift.circleId}/shifts/${shiftId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-circle");

  return { success: true, circleId: shift.circleId };
}
