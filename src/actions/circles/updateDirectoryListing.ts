// actions/circles/updateDirectoryListing.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Show or hide a circle in the congregation directory (/find). Admins only. */
export async function updateDirectoryListing(
  circleId: string,
  listed: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not signed in" };
  }

  const membership = await db.circleMembership.findUnique({
    where: { userId_circleId: { userId: session.user.id, circleId } },
    select: { role: true, active: true },
  });

  const isAdmin = membership?.active && membership.role === "ADMIN";
  if (!isAdmin && !session.user.isSuperAdmin) {
    return {
      success: false,
      error: "Only the organizer can change the directory listing",
    };
  }

  await db.careCircle.update({
    where: { id: circleId },
    data: { listedInDirectory: listed },
  });

  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/find");

  return { success: true };
}
