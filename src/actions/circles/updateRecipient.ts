// actions/circles/updateRecipient.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import {
  UpdateRecipientSchema,
  UpdateRecipientSchemaType,
} from "@/schemas/UpdateRecipientSchema";
import { revalidatePath } from "next/cache";

export async function updateRecipient(
  circleId: string,
  values: UpdateRecipientSchemaType,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not signed in" };
  }

  const validated = UpdateRecipientSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid fields",
    };
  }

  // Caller must be an ADMIN on this circle (or a super admin)
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
      error: "Only admins can edit recipient info",
    };
  }

  // Look up the circle to get the recipient's user ID
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

  const { firstName, lastName, email, phone } = validated.data;
  const normalizedEmail = email.toLowerCase();
  const normalizedPhone = phone.replace(/\D/g, "");

  // If the email changed, check it isn't already in use by someone else
  const existingWithEmail = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingWithEmail && existingWithEmail.id !== circle.recipientId) {
    return {
      success: false,
      error: "That email is already in use by another account",
    };
  }

  await db.user.update({
    where: { id: circle.recipientId },
    data: {
      firstName,
      lastName,
      email: normalizedEmail,
      phone: normalizedPhone,
    },
  });

  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-circle");

  return { success: true };
}
