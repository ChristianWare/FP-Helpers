// actions/circles/deleteCircle.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteCircle(circleId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: {
        userId: session.user.id,
        circleId,
      },
    },
  });

  if (!membership && !session.user.isSuperAdmin) {
    return { error: "You don't have permission to delete this circle" };
  }

  if (membership && membership.role !== "ADMIN") {
    return { error: "Only admins can delete a circle" };
  }

  try {
    await db.careCircle.delete({
      where: { id: circleId },
    });

    // Invalidate cached pages that display circle data
    revalidatePath("/dashboard");
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    console.error("[deleteCircle] Error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
