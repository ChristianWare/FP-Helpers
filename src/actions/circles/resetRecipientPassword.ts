// actions/circles/resetRecipientPassword.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import {
  ResetRecipientPasswordSchema,
  ResetRecipientPasswordSchemaType,
} from "@/schemas/ResetRecipientPasswordSchema";
import bcryptjs from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function resetRecipientPassword(
  circleId: string,
  values: ResetRecipientPasswordSchemaType,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not signed in" };
  }

  const validated = ResetRecipientPasswordSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid fields",
    };
  }

  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: {
        userId: session.user.id,
        circleId,
      },
    },
    select: { role: true },
  });

  const isAdmin = membership?.role === "ADMIN";
  if (!isAdmin && !session.user.isSuperAdmin) {
    return {
      success: false,
      error: "Only admins can reset the recipient's password",
    };
  }

  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    select: { recipientId: true },
  });

  if (!circle) {
    return { success: false, error: "Circle not found" };
  }

  if (!circle.recipientId) {
    return {
      success: false,
      error: "This circle has no recipient linked",
    };
  }

  const hashed = await bcryptjs.hash(validated.data.newPassword, 10);

  await db.user.update({
    where: { id: circle.recipientId },
    data: { password: hashed },
  });

  revalidatePath(`/circles/${circleId}`);

  return { success: true };
}
