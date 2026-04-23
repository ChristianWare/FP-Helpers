// actions/shifts/markShiftComplete.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markShiftComplete(shiftId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      circleId: true,
      assignedUserId: true,
      status: true,
    },
  });

  if (!shift) return { error: "Shift not found" };

  // Only the assigned helper can close out their own shift
  if (shift.assignedUserId !== session.user.id) {
    return { error: "Only the assigned helper can complete this shift" };
  }

  if (shift.status === "COMPLETED") {
    return { error: "This shift is already complete" };
  }

  const now = new Date();

  // One transaction: flip all pending items + flip the shift itself
  await db.$transaction([
    db.groceryItem.updateMany({
      where: {
        assignedShiftId: shiftId,
        status: { in: ["PENDING", "ASSIGNED"] },
      },
      data: {
        status: "PURCHASED",
        purchasedAt: now,
      },
    }),
    db.shift.update({
      where: { id: shiftId },
      data: {
        status: "COMPLETED",
        completedAt: now,
      },
    }),
    db.shiftEvent.create({
      data: {
        shiftId,
        type: "COMPLETED",
        actorId: session.user.id,
      },
    }),
    // Bump the helper's shiftsCompleted counter
    db.circleMembership.updateMany({
      where: {
        userId: session.user.id,
        circleId: shift.circleId,
      },
      data: {
        shiftsCompleted: { increment: 1 },
        lastActiveAt: now,
      },
    }),
  ]);

  revalidatePath(`/circles/${shift.circleId}/shifts/${shiftId}`);
  revalidatePath("/my-circle");
  revalidatePath("/dashboard");

  return { success: true };
}
