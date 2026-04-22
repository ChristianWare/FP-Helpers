// actions/circles/generateJoinLink.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/tokens";

export async function generateJoinLink(circleId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in" };
  }

  // Verify the user is an admin on this circle
  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: {
        userId: session.user.id,
        circleId,
      },
    },
  });

  if (!membership || membership.role !== "ADMIN") {
    return { error: "Only admins can generate invite links" };
  }

  // Check if an active link already exists
  const existing = await db.circleJoinLink.findFirst({
    where: { circleId, active: true },
  });

  if (existing) {
    return { success: true, token: existing.token };
  }

  // Create a new one
  const token = generateToken();

  await db.circleJoinLink.create({
    data: {
      circleId,
      token,
      role: "HELPER",
      active: true,
      createdById: session.user.id,
    },
  });

  return { success: true, token };
}
