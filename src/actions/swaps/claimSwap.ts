// actions/swaps/claimSwap.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { sendSwapClaimedEmails } from "@/lib/notifications/sendSwapClaimedEmails";
import { revalidatePath } from "next/cache";

type ClaimSwapResult =
  | {
      success: true;
      shiftId: string;
      circleId: string;
    }
  | {
      success: false;
      error: string;
      alreadyClaimed?: boolean;
    };

export async function claimSwap({
  swapRequestId,
}: {
  swapRequestId: string;
}): Promise<ClaimSwapResult> {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  const claimerId = session.user.id;

  // 2. Load the swap request + shift + verify claimer is eligible
  const swapRequest = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    include: {
      shift: {
        select: {
          id: true,
          circleId: true,
          scheduledDate: true,
          status: true,
          assignedUserId: true,
        },
      },
    },
  });

  if (!swapRequest) {
    return { success: false, error: "Swap request not found" };
  }

  // 3. Can't claim your own request
  if (swapRequest.requestedById === claimerId) {
    return {
      success: false,
      error: "You can't take your own shift — this is your swap request",
    };
  }

  // 4. Must be an in-rotation helper in this circle
  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: {
        userId: claimerId,
        circleId: swapRequest.shift.circleId,
      },
    },
  });

  if (
    !membership ||
    !membership.active ||
    !membership.inRotation ||
    (membership.role !== "ADMIN" && membership.role !== "HELPER")
  ) {
    return {
      success: false,
      error: "You're not eligible to take shifts in this circle",
    };
  }

  // 5. Shift must still be in a swappable state
  if (
    swapRequest.shift.status !== "SCHEDULED" &&
    swapRequest.shift.status !== "IN_PROGRESS"
  ) {
    return {
      success: false,
      error: `This shift is ${swapRequest.shift.status.toLowerCase()} and can no longer be swapped`,
    };
  }

  // 6. Can't claim shifts in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (swapRequest.shift.scheduledDate < today) {
    return {
      success: false,
      error: "This shift is in the past",
    };
  }

  // 7. The ATOMIC CLAIM — this is the race-safe update.
  //    Use updateMany with a WHERE clause that guards status === "OPEN".
  //    If someone else already claimed it, this returns count: 0 and we bail.
  let claimSuccessful = false;

  try {
    await db.$transaction(async (tx) => {
      // Atomic update of the swap request — only succeeds if still OPEN
      const updateResult = await tx.swapRequest.updateMany({
        where: {
          id: swapRequestId,
          status: "OPEN",
        },
        data: {
          status: "CLAIMED",
          claimedById: claimerId,
          resolvedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Someone else got there first — abort the transaction
        throw new Error("ALREADY_CLAIMED");
      }

      // Reassign the shift
      await tx.shift.update({
        where: { id: swapRequest.shift.id },
        data: {
          assignedUserId: claimerId,
          // Note: originalAssignedUserId stays the same — preserves audit trail
        },
      });

      // Log the reassignment event
      await tx.shiftEvent.create({
        data: {
          shiftId: swapRequest.shift.id,
          type: "SWAP_CLAIMED",
          actorId: claimerId,
          metadata: {
            swapRequestId,
            fromUserId: swapRequest.requestedById,
            toUserId: claimerId,
          },
        },
      });

      claimSuccessful = true;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_CLAIMED") {
      return {
        success: false,
        error: "Someone else already took this shift",
        alreadyClaimed: true,
      };
    }
    console.error("[claimSwap] Transaction error:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }

  if (!claimSuccessful) {
    return { success: false, error: "Claim failed for an unknown reason" };
  }

  // 8. Send confirmation emails (outside transaction — best effort)
  try {
    await sendSwapClaimedEmails({ swapRequestId });
  } catch (err) {
    console.error("[claimSwap] Failed to send confirmation emails:", err);
    // Don't fail the claim if emails fail
  }

  // 9. Revalidate all affected pages
  revalidatePath(
    `/circles/${swapRequest.shift.circleId}/shifts/${swapRequest.shift.id}`,
  );
  revalidatePath(`/circles/${swapRequest.shift.circleId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-circle"); // recipient may see "who's covering"

  return {
    success: true,
    shiftId: swapRequest.shift.id,
    circleId: swapRequest.shift.circleId,
  };
}
