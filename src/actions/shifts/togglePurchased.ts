// actions/shifts/togglePurchased.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function togglePurchased(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  // Load item + its shift, so we can verify the current user is the helper
  const item = await db.groceryItem.findUnique({
    where: { id: itemId },
    include: {
      assignedShift: {
        select: {
          id: true,
          circleId: true,
          assignedUserId: true,
          status: true,
        },
      },
    },
  });

  if (!item) return { error: "Item not found" };
  if (!item.assignedShift) return { error: "Item is not assigned to a shift" };

  // Only the assigned helper can tick items
  if (item.assignedShift.assignedUserId !== session.user.id) {
    return { error: "Only the assigned helper can mark items purchased" };
  }

  // Don't allow edits to items on an already-completed shift
  if (item.assignedShift.status === "COMPLETED") {
    return { error: "This shift is already marked complete" };
  }

  const isCurrentlyPurchased = item.status === "PURCHASED";
  const newStatus = isCurrentlyPurchased ? "PENDING" : "PURCHASED";

  await db.groceryItem.update({
    where: { id: itemId },
    data: {
      status: newStatus,
      purchasedAt: isCurrentlyPurchased ? null : new Date(),
    },
  });

  // Flip the shift into IN_PROGRESS on first tick so the state tracks reality
  if (!isCurrentlyPurchased && item.assignedShift.status === "SCHEDULED") {
    await db.shift.update({
      where: { id: item.assignedShift.id },
      data: { status: "IN_PROGRESS" },
    });
  }

  revalidatePath(
    `/circles/${item.assignedShift.circleId}/shifts/${item.assignedShift.id}`,
  );
  revalidatePath("/my-circle");
  revalidatePath("/dashboard");

  return { success: true };
}
