// lib/shifts/rotationOrder.ts
//
// The ROTATION ORDER of a standard circle: who goes after whom, repeating.
// A rotation change is a change to the ORDER — stored on the memberships and
// dealt across every upcoming shift, so it holds for every future turn.
import { db } from "@/lib/db";
import { shiftDayCutoff } from "@/lib/shifts/scheduleDates";

export type RotationSlot = {
  id: string;
  status: string;
  assignedUserId: string | null;
  originalAssignedUserId: string | null;
  // A helper swap REQUEST was opened/claimed on this date. That's a one-off
  // favor for one date — never part of the order, never overridden.
  hasSwapRequest: boolean;
};

// Whose TURN a slot represents.
function turnOwner(slot: RotationSlot): string | null {
  return slot.hasSwapRequest
    ? (slot.originalAssignedUserId ?? slot.assignedUserId)
    : slot.assignedUserId;
}

/**
 * The order people will NEXT serve in: walk the upcoming dates and note each
 * helper the first time they appear. Anyone with no upcoming turn (they just
 * joined) goes to the end. `rosterUserIds` must be sorted by rotationOrder.
 */
export function inferRotationOrder(
  rosterUserIds: string[],
  upcomingSlots: RotationSlot[],
): string[] {
  const roster = new Set(rosterUserIds);
  const seen = new Set<string>();
  const order: string[] = [];

  for (const slot of upcomingSlots) {
    const userId = turnOwner(slot);
    if (!userId || !roster.has(userId) || seen.has(userId)) continue;
    seen.add(userId);
    order.push(userId);
    if (order.length === rosterUserIds.length) break;
  }

  for (const userId of rosterUserIds) {
    if (!seen.has(userId)) order.push(userId);
  }

  return order;
}

/**
 * Deals `order` across the upcoming slots (slot 0 → order[0], and round
 * again). Returns only the shifts that need to change. Started shifts and
 * dates with a swap request still use up a turn but are never rewritten.
 */
export function dealRotation(
  order: string[],
  upcomingSlots: RotationSlot[],
): { shiftId: string; userId: string }[] {
  if (order.length === 0) return [];
  const changes: { shiftId: string; userId: string }[] = [];

  upcomingSlots.forEach((slot, index) => {
    const userId = order[index % order.length];
    if (slot.status !== "SCHEDULED" || slot.hasSwapRequest) return;
    if (
      slot.assignedUserId !== userId ||
      slot.originalAssignedUserId !== userId
    ) {
      changes.push({ shiftId: slot.id, userId });
    }
  });

  return changes;
}

/** `order` with two people's positions exchanged. Null if either is missing. */
export function swapInOrder(
  order: string[],
  userA: string,
  userB: string,
): string[] | null {
  const a = order.indexOf(userA);
  const b = order.indexOf(userB);
  if (a < 0 || b < 0) return null;
  const next = [...order];
  next[a] = userB;
  next[b] = userA;
  return next;
}

/** Helpers in the rotation, sorted by their stored order. */
export async function getRotationRoster(circleId: string) {
  return db.circleMembership.findMany({
    where: {
      circleId,
      active: true,
      inRotation: true,
      role: { in: ["ADMIN", "HELPER"] },
    },
    orderBy: [{ rotationOrder: "asc" }, { joinedAt: "asc" }],
    select: {
      userId: true,
      rotationOrder: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
}

/** Upcoming shifts that occupy a turn, soonest first. */
export async function getUpcomingSlots(
  circleId: string,
): Promise<(RotationSlot & { scheduledDate: Date })[]> {
  const shifts = await db.shift.findMany({
    where: {
      circleId,
      scheduledDate: { gt: shiftDayCutoff() },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    orderBy: { scheduledDate: "asc" },
    select: {
      id: true,
      status: true,
      scheduledDate: true,
      assignedUserId: true,
      originalAssignedUserId: true,
      swapRequests: {
        where: { status: { in: ["OPEN", "CLAIMED"] } },
        select: { id: true },
      },
    },
  });

  return shifts.map((s) => ({
    id: s.id,
    status: s.status,
    scheduledDate: s.scheduledDate,
    assignedUserId: s.assignedUserId,
    originalAssignedUserId: s.originalAssignedUserId,
    hasSwapRequest: s.swapRequests.length > 0,
  }));
}

/**
 * Makes `order` THE rotation: saves it on the memberships and re-deals every
 * upcoming shift. `order[0]` takes the next upcoming date.
 * Returns how many shifts changed hands.
 */
export async function applyRotationOrder(
  circleId: string,
  order: string[],
  actorId?: string,
): Promise<number> {
  if (order.length === 0) return 0;

  const slots = await getUpcomingSlots(circleId);
  const changes = dealRotation(order, slots);
  const previous = new Map(slots.map((s) => [s.id, s.assignedUserId]));
  const reassigned = changes.filter(
    (c) => previous.get(c.shiftId) !== c.userId,
  );

  await db.$transaction(async (tx) => {
    for (let index = 0; index < order.length; index++) {
      await tx.circleMembership.update({
        where: { userId_circleId: { userId: order[index], circleId } },
        data: { rotationOrder: index },
      });
    }

    for (const change of changes) {
      await tx.shift.update({
        where: { id: change.shiftId },
        data: {
          assignedUserId: change.userId,
          originalAssignedUserId: change.userId,
        },
      });
    }

    if (reassigned.length > 0) {
      await tx.shiftEvent.createMany({
        data: reassigned.map((c) => ({
          shiftId: c.shiftId,
          type: "REASSIGNED" as const,
          actorId: actorId ?? null,
          metadata: {
            fromUserId: previous.get(c.shiftId) ?? null,
            toUserId: c.userId,
            reason: "rotation_order_change",
          },
        })),
      });
    }
  });

  return reassigned.length;
}

/** Brings upcoming shifts in line with the rotation. No-op when consistent. */
export async function normalizeRotation(circleId: string): Promise<number> {
  const roster = await getRotationRoster(circleId);
  if (roster.length === 0) return 0;

  const slots = await getUpcomingSlots(circleId);
  const order = inferRotationOrder(
    roster.map((m) => m.userId),
    slots,
  );
  return applyRotationOrder(circleId, order);
}
