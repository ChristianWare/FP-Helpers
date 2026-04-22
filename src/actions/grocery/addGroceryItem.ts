// actions/grocery/addGroceryItem.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { z } from "zod";

const AddItemSchema = z.object({
  circleId: z.string().min(1),
  name: z.string().min(1, "Item name is required").max(200),
  quantity: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export async function addGroceryItem(values: {
  circleId: string;
  name: string;
  quantity?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const validated = AddItemSchema.safeParse(values);
  if (!validated.success) return { error: "Please enter an item name" };

  const { circleId, name, quantity, notes } = validated.data;

  // Verify user is a member of this circle
  const membership = await db.circleMembership.findUnique({
    where: { userId_circleId: { userId: session.user.id, circleId } },
  });
  if (!membership) return { error: "You're not a member of this circle" };

  const item = await db.groceryItem.create({
    data: {
      circleId,
      name: name.trim(),
      quantity: quantity?.trim() || null,
      notes: notes?.trim() || null,
      addedById: session.user.id,
      status: "PENDING",
    },
  });

  return { success: true, item };
}
