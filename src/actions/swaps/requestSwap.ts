// actions/swaps/requestSwap.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { sendSwapRequestEmails } from "@/lib/notifications/sendSwapRequestEmails";
import { revalidatePath } from "next/cache";

type RequestSwapInput = {
  shiftId: string;
  reason?: string;
};

type RequestSwapResult =
  | {
      success: true;
      swapRequestId: string;
      recipientsNotified: number;
    }
  | {
      success: false;
      error: string;
    };

export async function requestSwap({
  shiftId,
  reason,
}: RequestSwapInput): Promise<RequestSwapResult> {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  // 2. Load the shift and confirm the requester is the current assignee
  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    select: {
      id: true,
      circleId: true,
      scheduledDate: true,
      status: true,
      assignedUserId: true,
    },
  });

  if (!shift) {
    return { success: false, error: "Shift not found" };
  }

  if (shift.assignedUserId !== session.user.id) {
    return {
      success: false,
      error: "Only the assigned helper can request a swap for this shift",
    };
  }

  // 3. Status guard — can't swap completed, cancelled, or missed shifts
  if (shift.status !== "SCHEDULED" && shift.status !== "IN_PROGRESS") {
    return {
      success: false,
      error: `This shift is ${shift.status.toLowerCase()} and can't be swapped`,
    };
  }

  // 4. Date guard — can't swap a shift that's already passed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (shift.scheduledDate < today) {
    return {
      success: false,
      error: "This shift is in the past and can't be swapped",
    };
  }

  // 5. Prevent double-requests — check for existing OPEN request
  const existingOpen = await db.swapRequest.findFirst({
    where: {
      shiftId,
      status: "OPEN",
    },
  });

  if (existingOpen) {
    return {
      success: false,
      error: "A swap request is already open for this shift",
    };
  }

  // 6. Find all other in-rotation helpers in the circle to notify
  //    (exclude the requester, recipient, and anyone not in rotation)
  const otherHelpers = await db.circleMembership.findMany({
    where: {
      circleId: shift.circleId,
      active: true,
      inRotation: true,
      role: { in: ["ADMIN", "HELPER"] },
      userId: { not: session.user.id },
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          emailOptIn: true,
        },
      },
    },
  });

  if (otherHelpers.length === 0) {
    return {
      success: false,
      error:
        "There are no other helpers in this circle who can cover your shift",
    };
  }

  // 7. Create the SwapRequest + log a ShiftEvent in a transaction
  const swapRequest = await db.$transaction(async (tx) => {
    const request = await tx.swapRequest.create({
      data: {
        shiftId,
        requestedById: session.user.id!,
        reason: reason?.trim() || null,
        status: "OPEN",
      },
    });

    await tx.shiftEvent.create({
      data: {
        shiftId,
        type: "SWAP_REQUESTED",
        actorId: session.user.id!,
        metadata: {
          swapRequestId: request.id,
          reason: reason?.trim() || null,
        },
      },
    });

    return request;
  });

  // 8. Send emails to all eligible helpers (outside the transaction)
  //    sendSwapRequestEmails handles opt-out checks + logs to NotificationLog
  let recipientsNotified = 0;
  try {
    const result = await sendSwapRequestEmails({
      swapRequestId: swapRequest.id,
    });
    recipientsNotified = result.sent;
  } catch (err) {
    console.error("[requestSwap] Failed to send emails:", err);
    // Don't fail the request if emails fail — the request is still created
    // and helpers can discover it via the dashboard
  }

  // 9. Revalidate affected pages
  revalidatePath(`/circles/${shift.circleId}/shifts/${shiftId}`);
  revalidatePath(`/circles/${shift.circleId}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    swapRequestId: swapRequest.id,
    recipientsNotified,
  };
}
