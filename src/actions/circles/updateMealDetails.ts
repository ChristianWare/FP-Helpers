// actions/circles/updateMealDetails.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import {
  MealDetailsSchema,
  MealDetailsSchemaType,
} from "@/schemas/MealSchemas";
import { revalidatePath } from "next/cache";

/**
 * Household size, allergies and preferences for a meal train.
 * Editable by the organizer — and by the recipient, who knows best.
 */
export async function updateMealDetails(
  circleId: string,
  values: MealDetailsSchemaType,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not signed in" };
  }

  const validated = MealDetailsSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid fields",
    };
  }

  const membership = await db.circleMembership.findUnique({
    where: { userId_circleId: { userId: session.user.id, circleId } },
    select: { role: true, active: true },
  });

  const canEdit =
    membership?.active &&
    (membership.role === "ADMIN" || membership.role === "RECIPIENT");
  if (!canEdit && !session.user.isSuperAdmin) {
    return {
      success: false,
      error: "Only the organizer or the recipient can edit these details",
    };
  }

  await db.careCircle.update({
    where: { id: circleId },
    data: {
      mealHouseholdSize: validated.data.mealHouseholdSize?.trim() || null,
      mealAllergies: validated.data.mealAllergies?.trim() || null,
      mealPreferences: validated.data.mealPreferences?.trim() || null,
    },
  });

  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/my-circle");

  return { success: true };
}
