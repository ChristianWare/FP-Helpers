// actions/auth/register.ts
"use server";

import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/user";
import { RegisterSchema, RegisterSchemaType } from "@/schemas/RegisterSchema";
import { signIn } from "../../../auth";
import bcryptjs from "bcryptjs";
import { AuthError } from "next-auth";

export const register = async (values: RegisterSchemaType) => {
  const validated = RegisterSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid fields" };

  const { firstName, lastName, email, phone, password, website } =
    validated.data;

  // Honeypot — silently succeed for bots
  if (website) return { success: true };

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await getUserByEmail(normalizedEmail);
  if (existing) return { error: "An account with this email already exists" };

  const hashedPassword = await bcryptjs.hash(password, 10);
  const normalizedPhone = phone.replace(/\D/g, "");

  await db.user.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  // Auto-sign-in after successful registration
  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Account was created but sign-in failed — weird but not fatal
      return {
        success: true,
        signInFailed: true,
      };
    }
    throw error;
  }
};
