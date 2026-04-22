// actions/grocery/removeGroceryItem.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function removeGroceryItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const item = await db.groceryItem.findUnique({
    where: { id: itemId },
    include: { circle: true },
  });

  if (!item) return { error: "Item not found" };

  // Verify user is a member
  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: { userId: session.user.id, circleId: item.circleId },
    },
  });
  if (!membership) return { error: "You're not a member of this circle" };

  await db.groceryItem.update({
    where: { id: itemId },
    data: { status: "REMOVED" },
  });

  revalidatePath("/my-circle");

  return { success: true };
}
