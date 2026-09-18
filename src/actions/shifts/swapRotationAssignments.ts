// actions/shifts/swapRotationAssignments.ts
//
// Admin-only: the helpers on two upcoming dates TRADE PLACES IN THE ROTATION,
// permanently — every upcoming shift is re-dealt, so it holds for every
// future turn, not just the two dates that were tapped.
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  applyRotationOrder,
  getRotationRoster,
  getUpcomingSlots,
  inferRotationOrder,
  swapInOrder,
} from "@/lib/shifts/rotationOrder";
import { shiftDayCutoff } from "@/lib/shifts/scheduleDates";

type SwapOutcome = { success: true } | { success: false; error: string };

export async function swapRotationAssignments(
  circleId: string,
  shiftIdA: string,
  shiftIdB: string,
): Promise<SwapOutcome> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not signed in" };
  }

  if (!shiftIdA || !shiftIdB || shiftIdA === shiftIdB) {
    return { success: false, error: "Pick two different dates to swap" };
  }

  const membership = await db.circleMembership.findUnique({
    where: { userId_circleId: { userId: session.user.id, circleId } },
    select: { role: true },
  });

  const isAdmin = membership?.role === "ADMIN";
  if (!isAdmin && !session.user.isSuperAdmin) {
    return { success: false, error: "Only admins can change the rotation" };
  }

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

  const cutoff = shiftDayCutoff();

  for (const shift of [shiftA, shiftB]) {
    if (shift.status !== "SCHEDULED") {
      return {
        success: false,
        error: "Only upcoming shifts can be moved (this one has started)",
      };
    }
    if (shift.scheduledDate <= cutoff) {
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

  try {
    const roster = await getRotationRoster(circleId);
    const slots = await getUpcomingSlots(circleId);
    const currentOrder = inferRotationOrder(
      roster.map((m) => m.userId),
      slots,
    );

    // A date traded through a swap request shows the person COVERING it, so
    // it can't stand in for anyone's place in the order.
    const traded = slots.find(
      (slot) =>
        (slot.id === shiftA.id || slot.id === shiftB.id) && slot.hasSwapRequest,
    );
    if (traded) {
      return {
        success: false,
        error:
          "One of those dates has a swap request on it, so it isn't part of the regular order. Pick that helper's regular date instead.",
      };
    }

    const newOrder = swapInOrder(currentOrder, userA, userB);
    if (!newOrder) {
      return {
        success: false,
        error:
          "One of those helpers isn't in the rotation anymore. Refresh and try again.",
      };
    }

    await applyRotationOrder(circleId, newOrder, session.user.id);
  } catch (err) {
    console.error("[swapRotationAssignments] Failed:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/my-circle");
  revalidatePath("/dashboard");

  return { success: true };
}
