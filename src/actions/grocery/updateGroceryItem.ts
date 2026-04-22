// actions/grocery/updateGroceryItem.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";

export async function updateGroceryItem(values: {
  itemId: string;
  name?: string;
  quantity?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const item = await db.groceryItem.findUnique({
    where: { id: values.itemId },
  });

  if (!item) return { error: "Item not found" };

  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: { userId: session.user.id, circleId: item.circleId },
    },
  });
  if (!membership) return { error: "You're not a member of this circle" };

  await db.groceryItem.update({
    where: { id: values.itemId },
    data: {
      name: values.name?.trim() ?? item.name,
      quantity: values.quantity?.trim() ?? item.quantity,
      notes: values.notes?.trim() ?? item.notes,
    },
  });

  return { success: true };
}
