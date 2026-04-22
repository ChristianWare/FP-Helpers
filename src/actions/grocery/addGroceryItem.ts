// actions/grocery/addGroceryItem.ts

"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { getNextShiftForCircle } from "@/lib/shifts/getNextShift";
import { revalidatePath } from "next/cache";

export async function addGroceryItem(values: {
  circleId: string;
  name: string;
  quantity?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  if (!values.name.trim()) return { error: "Item name is required" };

  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: { userId: session.user.id, circleId: values.circleId },
    },
  });
  if (!membership) return { error: "You're not a member of this circle" };

  // Auto-assign the item to the next upcoming shift, so it shows up on
  // "this week's shopping" for the helper.
  const nextShift = await getNextShiftForCircle(values.circleId);

  await db.groceryItem.create({
    data: {
      circleId: values.circleId,
      name: values.name.trim(),
      quantity: values.quantity?.trim() || null,
      notes: values.notes?.trim() || null,
      addedById: session.user.id,
      status: "PENDING",
      assignedShiftId: nextShift?.id ?? null,
    },
  });

  revalidatePath("/my-circle");

  return { success: true };
}
