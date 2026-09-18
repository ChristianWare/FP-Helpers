// actions/circles/joinCircle.ts
"use server";

import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/user";
import { RegisterSchema, RegisterSchemaType } from "@/schemas/RegisterSchema";
import { SlotSelectionsSchema, SlotSelection } from "@/schemas/MealSchemas";
import { signIn } from "../../../auth";
import {
  ensureShiftsForCircle,
  rebalanceShiftsForCircle,
} from "@/lib/shifts/generateShifts";
import { claimSlotsForUser } from "@/lib/meals/claimSlots";
import { sendMealSignupEmail } from "@/lib/notifications/mealTrainEmails";
import bcryptjs from "bcryptjs";
import { AuthError } from "next-auth";

/**
 * Join a circle from an invite link by creating a NEW account.
 * (People who already have an account use joinCircleAsExistingUser.)
 *
 *   STANDARD   → added to the end of the rotation; shifts are rebalanced.
 *   MEAL_TRAIN → NOT added to any rotation; the days they ticked on the
 *                invite page (`selections`) are claimed for them.
 */
export const joinCircle = async (
  token: string,
  values: RegisterSchemaType,
  selections: SlotSelection[] = [],
) => {
  const validated = RegisterSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid fields" };

  const validatedSelections = SlotSelectionsSchema.safeParse(selections);
  if (!validatedSelections.success) {
    return { error: "Something looks off with the days you picked" };
  }

  const { firstName, lastName, email, phone, password, website } =
    validated.data;

  // Honeypot
  if (website) return { success: true };

  // Look up the join link
  const joinLink = await db.circleJoinLink.findUnique({
    where: { token },
    include: { circle: true },
  });

  if (!joinLink) return { error: "This invitation link is not valid" };
  if (!joinLink.active)
    return { error: "This invitation link is no longer active" };
  if (joinLink.expiresAt && joinLink.expiresAt < new Date()) {
    return { error: "This invitation link has expired" };
  }
  if (joinLink.circle.status === "ARCHIVED") {
    return { error: "This circle has finished and isn't taking new helpers" };
  }

  const isMealTrain = joinLink.circle.circleType === "MEAL_TRAIN";
  const normalizedEmail = email.toLowerCase().trim();

  // Check if the user already exists
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    return {
      error:
        "An account with this email already exists. Use “Sign in” below — you'll come right back here to join.",
    };
  }

  const hashedPassword = await bcryptjs.hash(password, 10);
  const normalizedPhone = phone.replace(/\D/g, "");

  // Create user + circle membership in a transaction
  const userId = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });

    // Rotation circles: the new helper slots in at the end of the rotation.
    // Meal trains have no rotation, so there's no order to give them.
    const joinsRotation =
      !isMealTrain && (joinLink.role === "HELPER" || joinLink.role === "ADMIN");

    let nextOrder = -1;
    if (joinsRotation) {
      const lastOrder = await tx.circleMembership.findFirst({
        where: {
          circleId: joinLink.circleId,
          rotationOrder: { gte: 0 },
        },
        orderBy: { rotationOrder: "desc" },
        select: { rotationOrder: true },
      });
      nextOrder = (lastOrder?.rotationOrder ?? -1) + 1;
    }

    await tx.circleMembership.create({
      data: {
        userId: user.id,
        circleId: joinLink.circleId,
        role: joinLink.role,
        inRotation: joinsRotation,
        rotationOrder: nextOrder,
      },
    });

    return user.id;
  });

  let takenCount = 0;

  if (isMealTrain) {
    // Claim the days they picked. Anything grabbed by someone else in the
    // meantime comes back as unavailable — we tell them on the next page.
    try {
      const claim = await claimSlotsForUser({
        circleId: joinLink.circleId,
        userId,
        selections: validatedSelections.data,
      });
      takenCount = claim.unavailable.length;

      await sendMealSignupEmail({
        userId,
        circleId: joinLink.circleId,
        shiftIds: claim.claimed.map((c) => c.shiftId),
      });
    } catch (err) {
      console.error("[joinCircle] Failed to claim meal train days:", err);
    }
  } else {
    // Extend the shift schedule to pick up the new helper, then rebalance
    // so existing future shifts get reassigned round-robin with the new roster.
    try {
      await ensureShiftsForCircle(joinLink.circleId);
      await rebalanceShiftsForCircle(joinLink.circleId);
    } catch (err) {
      console.error("[joinCircle] Failed to regenerate shifts:", err);
    }
  }

  const redirectTo = isMealTrain
    ? `/circles/${joinLink.circleId}?joined=1${takenCount > 0 ? `&taken=${takenCount}` : ""}`
    : undefined;

  // Auto-sign-in
  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });
    return { success: true, circleId: joinLink.circleId, redirectTo };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: true, signInFailed: true };
    }
    throw error;
  }
};
