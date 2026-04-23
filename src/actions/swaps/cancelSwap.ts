// actions/swaps/cancelSwap.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function cancelSwap({ swapRequestId }: { swapRequestId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  const swap = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    select: {
      id: true,
      status: true,
      requestedById: true,
      shift: {
        select: { id: true, circleId: true },
      },
    },
  });

  if (!swap) {
    return { success: false, error: "Swap request not found" };
  }

  if (swap.requestedById !== session.user.id) {
    return {
      success: false,
      error: "Only the person who requested the swap can cancel it",
    };
  }

  if (swap.status !== "OPEN") {
    return {
      success: false,
      error: `This swap is already ${swap.status.toLowerCase()}`,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.swapRequest.update({
      where: { id: swapRequestId },
      data: {
        status: "CANCELLED",
        resolvedAt: new Date(),
      },
    });

    await tx.shiftEvent.create({
      data: {
        shiftId: swap.shift.id,
        type: "SWAP_REQUESTED", // We don't have a SWAP_CANCELLED enum value; log under same
        actorId: session.user.id!,
        metadata: { swapRequestId, cancelled: true },
      },
    });
  });

  revalidatePath(`/circles/${swap.shift.circleId}/shifts/${swap.shift.id}`);
  revalidatePath(`/circles/${swap.shift.circleId}`);
  revalidatePath("/dashboard");

  return { success: true };
}
