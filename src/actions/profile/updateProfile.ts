// actions/profile/updateProfile.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import {
  UpdateProfileSchema,
  UpdateProfileSchemaType,
} from "@/schemas/UpdateProfileSchema";
import { revalidatePath } from "next/cache";

export async function updateProfile(values: UpdateProfileSchemaType) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  const validated = UpdateProfileSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: "Some of your information looks off. Please check and try again.",
    };
  }

  const { firstName, lastName, email, phone, emailOptIn } = validated.data;

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone.replace(/\D/g, "");

  // If the email is changing, check that nobody else has it
  if (normalizedEmail !== session.user.email?.toLowerCase()) {
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing && existing.id !== session.user.id) {
      return {
        success: false,
        error: "That email is already in use on another account.",
      };
    }
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        emailOptIn,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    console.error("[updateProfile] Error:", err);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
