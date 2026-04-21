// actions/auth/register.ts
"use server";

import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/user";
import { RegisterSchema, RegisterSchemaType } from "@/schemas/RegisterSchema";
import bcryptjs from "bcryptjs";

export const register = async (values: RegisterSchemaType) => {
  const validated = RegisterSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid fields" };

  const { name, email, phone, password, website } = validated.data;

  // Honeypot — silently succeed for bots
  if (website) return { success: "Account created!" };

  const existing = await getUserByEmail(email);
  if (existing) return { error: "Email already in use" };

  const hashedPassword = await bcryptjs.hash(password, 10);

  await db.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      password: hashedPassword,
      emailVerified: new Date(), // auto-verify for now; we'll add email verification later
    },
  });

  return { success: "Account created! You can now sign in." };
};
