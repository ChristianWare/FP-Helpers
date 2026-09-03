// actions/shifts/swapRotationAssignments.ts
//
// Admin-only rotation edit: swaps the assigned helpers of two upcoming
// shifts (drag-and-drop on the circle page). One swap per call.
// Race-safe via guarded updateMany inside a transaction, and logged as
// REASSIGNED ShiftEvents on both shifts for the audit trail.
// originalAssignedUserId is intentionally left untouched (same convention
// as the helper swap flow — it preserves who was originally in rotation).
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

export async function swapRotationAssignments(
  circleId: string,
  shiftIdA: string,
  shiftIdB: string,
): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not signed in" };
  }

  if (!shiftIdA || !shiftIdB || shiftIdA === shiftIdB) {
    return { success: false, error: "Pick two different dates to swap" };
  }

  // Only circle admins (or the super admin) can edit the rotation
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
    return { success: false, error: "Only admins can change the rotation" };
  }

  // Load both shifts
  const shifts = await db.shift.findMany({
    where: { id: { in: [shiftIdA, shiftIdB] }, circleId },
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      assignedUserId: true,
    },
  });

  const shiftA = shifts.find((s) => s.id === shiftIdA);
  const shiftB = shifts.find((s) => s.id === shiftIdB);

  if (!shiftA || !shiftB) {
    return {
      success: false,
      error: "One of those shifts no longer exists in this circle",
    };
  }

  // Both must be upcoming, untouched shifts with someone assigned
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const shift of [shiftA, shiftB]) {
    if (shift.status !== "SCHEDULED") {
      return {
        success: false,
        error: "Only upcoming shifts can be moved (this one has started)",
      };
    }
    if (shift.scheduledDate < today) {
      return { success: false, error: "Shifts in the past can't be moved" };
    }
    if (!shift.assignedUserId) {
      return {
        success: false,
        error: "Both dates need an assigned helper to swap",
      };
    }
  }

  const userA = shiftA.assignedUserId!;
  const userB = shiftB.assignedUserId!;

  if (userA === userB) {
    return {
      success: false,
      error: "The same helper is on both dates — nothing to swap",
    };
  }

  // The atomic swap. Each updateMany is guarded on the status AND the
  // assignee we just read — if either shift changed under us (completed,
  // swapped by a helper, reassigned by another admin), count comes back 0
  // and the whole transaction rolls back.
  try {
    await db.$transaction(async (tx) => {
      const resA = await tx.shift.updateMany({
        where: { id: shiftA.id, status: "SCHEDULED", assignedUserId: userA },
        data: { assignedUserId: userB },
      });
      if (resA.count === 0) throw new Error("STALE");

      const resB = await tx.shift.updateMany({
        where: { id: shiftB.id, status: "SCHEDULED", assignedUserId: userB },
        data: { assignedUserId: userA },
      });
      if (resB.count === 0) throw new Error("STALE");

      // Audit trail — one REASSIGNED event per shift
      await tx.shiftEvent.createMany({
        data: [
          {
            shiftId: shiftA.id,
            type: "REASSIGNED",
            actorId: session.user.id,
            metadata: {
              fromUserId: userA,
              toUserId: userB,
              swappedWithShiftId: shiftB.id,
              reason: "admin_rotation_change",
            },
          },
          {
            shiftId: shiftB.id,
            type: "REASSIGNED",
            actorId: session.user.id,
            metadata: {
              fromUserId: userB,
              toUserId: userA,
              swappedWithShiftId: shiftA.id,
              reason: "admin_rotation_change",
            },
          },
        ],
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "STALE") {
      return {
        success: false,
        error:
          "One of those shifts just changed (completed or reassigned). Refresh and try again.",
      };
    }
    console.error("[swapRotationAssignments] Transaction error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/my-circle");
  revalidatePath("/dashboard");

  return { success: true };
}
