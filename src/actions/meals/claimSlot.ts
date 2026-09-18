// actions/meals/claimSlot.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { MealSchema, MealSchemaType } from "@/schemas/MealSchemas";
import { claimSlotsForUser } from "@/lib/meals/claimSlots";
import { sendMealSignupEmail } from "@/lib/notifications/mealTrainEmails";
import { revalidatePath } from "next/cache";

type ClaimSlotOutcome =
  { success: true } | { success: false; error: string; alreadyTaken?: boolean };

/** Sign the current user up for one open day of a meal train. */
export async function claimSlot(
  shiftId: string,
  meal: MealSchemaType = {},
): Promise<ClaimSlotOutcome> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }
  const userId = session.user.id;

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
      id: true,
      circleId: true,
      circle: { select: { circleType: true, status: true } },
    },
  });

  if (!shift) return { success: false, error: "That day no longer exists" };
  if (shift.circle.circleType !== "MEAL_TRAIN") {
    return { success: false, error: "This circle doesn't use sign-ups" };
  }
  if (shift.circle.status !== "ACTIVE") {
    return { success: false, error: "This meal train isn't active right now" };
  }

  const membership = await db.circleMembership.findUnique({
    where: { userId_circleId: { userId, circleId: shift.circleId } },
    select: { active: true, role: true },
  });

  if (
    !membership ||
    !membership.active ||
    (membership.role !== "ADMIN" && membership.role !== "HELPER")
  ) {
    return {
      success: false,
      error: "Only helpers in this circle can sign up for a day",
    };
  }

  const result = await claimSlotsForUser({
    circleId: shift.circleId,
    userId,
    selections: [{ shiftId, ...validated.data }],
  });

  revalidatePath(`/circles/${shift.circleId}`);
  revalidatePath(`/circles/${shift.circleId}/shifts/${shiftId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-circle");

  if (result.claimed.length === 0) {
    return {
      success: false,
      alreadyTaken: true,
      error: "Someone just took that day — here's what's still open.",
    };
  }

  await sendMealSignupEmail({
    userId,
    circleId: shift.circleId,
    shiftIds: [shiftId],
  });

  return { success: true };
}
