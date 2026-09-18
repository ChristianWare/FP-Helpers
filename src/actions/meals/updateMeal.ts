// actions/meals/updateMeal.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { MealSchema, MealSchemaType } from "@/schemas/MealSchemas";
import { revalidatePath } from "next/cache";

/** Change what you're bringing on a day you've claimed (or an admin fixing it). */
export async function updateMeal(
  shiftId: string,
  meal: MealSchemaType,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  const validated = MealSchema.safeParse(meal);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid fields",
    };
  }

  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    select: {
      circleId: true,
      assignedUserId: true,
      circle: { select: { circleType: true } },
    },
  });

  if (!shift) return { success: false, error: "That day no longer exists" };
  if (shift.circle.circleType !== "MEAL_TRAIN") {
    return { success: false, error: "This circle doesn't use sign-ups" };
  }
  if (!shift.assignedUserId) {
    return { success: false, error: "Nobody has signed up for this day yet" };
  }

  if (shift.assignedUserId !== session.user.id) {
    const membership = await db.circleMembership.findUnique({
      where: {
        userId_circleId: { userId: session.user.id, circleId: shift.circleId },
      },
      select: { role: true, active: true },
    });
    const isAdmin = membership?.active && membership.role === "ADMIN";
    if (!isAdmin && !session.user.isSuperAdmin) {
      return {
        success: false,
        error: "Only the person bringing the meal can change it",
      };
    }
  }

  await db.shift.update({
    where: { id: shiftId },
    data: {
      mealDescription: validated.data.mealDescription?.trim() || null,
      mealNotes: validated.data.mealNotes?.trim() || null,
    },
  });

  revalidatePath(`/circles/${shift.circleId}`);
  revalidatePath(`/circles/${shift.circleId}/shifts/${shiftId}`);
  revalidatePath("/my-circle");

  return { success: true };
}
