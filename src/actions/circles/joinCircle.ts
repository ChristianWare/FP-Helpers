// actions/circles/joinCircle.ts
"use server";

import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/user";
import { RegisterSchema, RegisterSchemaType } from "@/schemas/RegisterSchema";
import { signIn } from "../../../auth";
import {
  ensureShiftsForCircle,
  rebalanceShiftsForCircle,
} from "@/lib/shifts/generateShifts";
import bcryptjs from "bcryptjs";
import { AuthError } from "next-auth";

export const joinCircle = async (token: string, values: RegisterSchemaType) => {
  const validated = RegisterSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid fields" };

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

  const normalizedEmail = email.toLowerCase().trim();

  // Check if the user already exists
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    return {
      error:
        "An account with this email already exists. Please sign in instead.",
    };
  }

  const hashedPassword = await bcryptjs.hash(password, 10);
  const normalizedPhone = phone.replace(/\D/g, "");

  // Create user + circle membership in a transaction
  await db.$transaction(async (tx) => {
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

    // Find the highest rotation order in this circle so the new helper
    // slots in at the end of the rotation
    const lastOrder = await tx.circleMembership.findFirst({
      where: {
        circleId: joinLink.circleId,
        rotationOrder: { gte: 0 },
      },
      orderBy: { rotationOrder: "desc" },
      select: { rotationOrder: true },
    });
    const nextOrder = (lastOrder?.rotationOrder ?? -1) + 1;

    await tx.circleMembership.create({
      data: {
        userId: user.id,
        circleId: joinLink.circleId,
        role: joinLink.role,
        inRotation: joinLink.role === "HELPER" || joinLink.role === "ADMIN",
        rotationOrder:
          joinLink.role === "HELPER" || joinLink.role === "ADMIN"
            ? nextOrder
            : -1,
      },
    });
  });

  // Extend the shift schedule to pick up the new helper, then rebalance
  // so existing future shifts get reassigned round-robin with the new roster.
  try {
    await ensureShiftsForCircle(joinLink.circleId);
    await rebalanceShiftsForCircle(joinLink.circleId);
  } catch (err) {
    console.error("[joinCircle] Failed to regenerate shifts:", err);
  }

  // Auto-sign-in
  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });
    return { success: true, circleId: joinLink.circleId };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: true, signInFailed: true };
    }
    throw error;
  }
};
