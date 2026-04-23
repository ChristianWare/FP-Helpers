// actions/profile/updatePassword.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import {
  UpdatePasswordSchema,
  UpdatePasswordSchemaType,
} from "@/schemas/UpdatePasswordSchema";
import bcryptjs from "bcryptjs";

export async function updatePassword(values: UpdatePasswordSchemaType) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  const validated = UpdatePasswordSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: "Please check your inputs and try again.",
    };
  }

  const { currentPassword, newPassword } = validated.data;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    return {
      success: false,
      error: "No password is set on this account.",
    };
  }

  const isMatch = await bcryptjs.compare(currentPassword, user.password);
  if (!isMatch) {
    return {
      success: false,
      error: "Current password is incorrect.",
    };
  }

  const hashed = await bcryptjs.hash(newPassword, 10);

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    });

    return { success: true };
  } catch (err) {
    console.error("[updatePassword] Error:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
