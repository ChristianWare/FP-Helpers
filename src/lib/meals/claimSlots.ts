// lib/meals/claimSlots.ts
//
// The one place a meal train day gets claimed. Used by the "Sign up" button
// on the calendar AND by both join flows (new account / existing account),
// so every path has identical, race-safe behavior.
import { db } from "@/lib/db";
import { shiftDayCutoff } from "@/lib/shifts/scheduleDates";
import type { SlotSelection } from "@/schemas/MealSchemas";

export type ClaimResult = {
  /** Days this user now holds, soonest first. */
  claimed: { shiftId: string; scheduledDate: Date }[];
  /** Days that were taken (or removed) between page load and submit. */
  unavailable: string[];
};

/**
 * Claims each selected day for `userId`.
 *
 * Race-safe: each claim is a single guarded updateMany — it only succeeds if
 * the day is STILL unassigned at the moment of the write. When two people tap
 * the same Tuesday at once, exactly one update matches a row; the other gets
 * count 0 and that day comes back in `unavailable`.
 *
 * Callers are responsible for checking that the user is allowed to sign up
 * (an active ADMIN/HELPER member of an ACTIVE meal train).
 */
export async function claimSlotsForUser({
  circleId,
  userId,
  selections,
}: {
  circleId: string;
  userId: string;
  selections: SlotSelection[];
}): Promise<ClaimResult> {
  const result: ClaimResult = { claimed: [], unavailable: [] };

  // De-dupe by shiftId — last one wins
  const unique = Array.from(
    new Map(selections.map((s) => [s.shiftId, s])).values(),
  );

  for (const selection of unique) {
    const update = await db.shift.updateMany({
      where: {
        id: selection.shiftId,
        circleId,
        assignedUserId: null,
        status: "SCHEDULED",
        scheduledDate: { gt: shiftDayCutoff() },
      },
      data: {
        assignedUserId: userId,
        originalAssignedUserId: userId,
        mealDescription: selection.mealDescription?.trim() || null,
        mealNotes: selection.mealNotes?.trim() || null,
      },
    });

    if (update.count === 0) {
      result.unavailable.push(selection.shiftId);
      continue;
    }

    const shift = await db.shift.findUnique({
      where: { id: selection.shiftId },
      select: { scheduledDate: true },
    });

    await db.shiftEvent.create({
      data: {
        shiftId: selection.shiftId,
        type: "ASSIGNED",
        actorId: userId,
        metadata: { via: "meal_train_signup" },
      },
    });

    if (shift) {
      result.claimed.push({
        shiftId: selection.shiftId,
        scheduledDate: shift.scheduledDate,
      });
    }
  }

  result.claimed.sort(
    (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
  );

  return result;
}
