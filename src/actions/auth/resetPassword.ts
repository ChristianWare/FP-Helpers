// actions/auth/resetPassword.ts
"use server";

import { db } from "@/lib/db";
import {
  ResetPasswordSchema,
  ResetPasswordSchemaType,
} from "@/schemas/ResetPasswordSchema";
import bcryptjs from "bcryptjs";

export async function resetPassword(values: ResetPasswordSchemaType) {
  const validated = ResetPasswordSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { token, newPassword } = validated.data;

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true },
      },
    },
  });

  if (!resetToken) {
    return {
      success: false,
      error: "This reset link is not valid. Please request a new one.",
    };
  }

  if (resetToken.usedAt) {
    return {
      success: false,
      error: "This reset link has already been used. Please request a new one.",
    };
  }

  if (resetToken.expiresAt < new Date()) {
    return {
      success: false,
      error: "This reset link has expired. Please request a new one.",
    };
  }

  const hashedPassword = await bcryptjs.hash(newPassword, 10);

  // Update the password and mark the token used in a single transaction so
  // the link is burned whether or not both writes succeed
  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}
