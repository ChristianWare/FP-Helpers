// actions/circles/joinCircleAsExistingUser.ts
//
// Join a circle from an invite link while ALREADY signed in. Until now the
// invite page could only create brand-new accounts, so anyone who had helped
// with one circle couldn't join a second one. The invite page shows this path
// automatically when there's a session.
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { SlotSelectionsSchema, SlotSelection } from "@/schemas/MealSchemas";
import {
  ensureShiftsForCircle,
  rebalanceShiftsForCircle,
} from "@/lib/shifts/generateShifts";
import { claimSlotsForUser } from "@/lib/meals/claimSlots";
import { sendMealSignupEmail } from "@/lib/notifications/mealTrainEmails";
import { revalidatePath } from "next/cache";

type JoinExistingOutcome =
  { success: true; redirectTo: string } | { success: false; error: string };

export async function joinCircleAsExistingUser(
  token: string,
  selections: SlotSelection[] = [],
): Promise<JoinExistingOutcome> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Please sign in first" };
  }
  const userId = session.user.id;

  const validatedSelections = SlotSelectionsSchema.safeParse(selections);
  if (!validatedSelections.success) {
    return {
      success: false,
      error: "Something looks off with the days you picked",
    };
  }

  const joinLink = await db.circleJoinLink.findUnique({
    where: { token },
    include: { circle: true },
  });

  if (!joinLink) {
    return { success: false, error: "This invitation link is not valid" };
  }
  if (!joinLink.active) {
    return {
      success: false,
      error: "This invitation link is no longer active",
    };
  }
  if (joinLink.expiresAt && joinLink.expiresAt < new Date()) {
    return { success: false, error: "This invitation link has expired" };
  }
  if (joinLink.circle.status === "ARCHIVED") {
    return {
      success: false,
      error: "This circle has finished and isn't taking new helpers",
    };
  }

  const circleId = joinLink.circleId;
  const isMealTrain = joinLink.circle.circleType === "MEAL_TRAIN";

  if (joinLink.circle.recipientId === userId) {
    return {
      success: false,
      error: "This circle was set up for you — you can't join it as a helper",
    };
  }

  const existingMembership = await db.circleMembership.findUnique({
    where: { userId_circleId: { userId, circleId } },
  });

  if (existingMembership && !existingMembership.active) {
    return {
      success: false,
      error:
        "You're no longer an active member of this circle. Ask the organizer to add you back.",
    };
  }
  if (existingMembership?.role === "RECIPIENT") {
    return {
      success: false,
      error: "This circle was set up for you — you can't join it as a helper",
    };
  }

  const isNewMember = !existingMembership;

  if (isNewMember) {
    const joinsRotation =
      !isMealTrain && (joinLink.role === "HELPER" || joinLink.role === "ADMIN");

    await db.$transaction(async (tx) => {
      let nextOrder = -1;
      if (joinsRotation) {
        const lastOrder = await tx.circleMembership.findFirst({
          where: { circleId, rotationOrder: { gte: 0 } },
          orderBy: { rotationOrder: "desc" },
          select: { rotationOrder: true },
        });
        nextOrder = (lastOrder?.rotationOrder ?? -1) + 1;
      }

      await tx.circleMembership.create({
        data: {
          userId,
          circleId,
          role: joinLink.role,
          inRotation: joinsRotation,
          rotationOrder: nextOrder,
        },
      });
    });
  }

  let takenCount = 0;

  if (isMealTrain) {
    const claim = await claimSlotsForUser({
      circleId,
      userId,
      selections: validatedSelections.data,
    });
    takenCount = claim.unavailable.length;

    await sendMealSignupEmail({
      userId,
      circleId,
      shiftIds: claim.claimed.map((c) => c.shiftId),
    });
  } else if (isNewMember) {
    // New person in the rotation → extend + re-deal the upcoming shifts
    try {
      await ensureShiftsForCircle(circleId);
      await rebalanceShiftsForCircle(circleId);
    } catch (err) {
      console.error(
        "[joinCircleAsExistingUser] Failed to regenerate shifts:",
        err,
      );
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/circles/${circleId}`);
  revalidatePath(`/join/${token}`);

  const params = new URLSearchParams();
  if (isNewMember) params.set("joined", "1");
  if (takenCount > 0) params.set("taken", String(takenCount));
  const query = params.toString();

  return {
    success: true,
    redirectTo: `/circles/${circleId}${query ? `?${query}` : ""}`,
  };
}
