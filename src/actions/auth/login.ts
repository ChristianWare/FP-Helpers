// actions/auth/login.ts
"use server";

import { getUserByEmail } from "@/lib/user";
import { LoginSchema, LoginSchemaType } from "@/schemas/LoginSchema";
import { signIn } from "../../../auth";
import { AuthError } from "next-auth";

export const login = async (values: LoginSchemaType) => {
  const validated = LoginSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid fields" };

  const { email, password } = validated.data;

  const user = await getUserByEmail(email);
  if (!user || !user.password) return { error: "Invalid credentials" };

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error; // rethrow redirect errors
  }
};
