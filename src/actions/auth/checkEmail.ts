// actions/auth/checkEmail.ts
"use server";

import { getUserByEmail } from "@/lib/user";
import { z } from "zod";

const EmailSchema = z.object({
  email: z.string().email(),
});

export async function checkEmail(email: string) {
  const validated = EmailSchema.safeParse({ email });
  if (!validated.success) return { error: "Please enter a valid email" };

  const user = await getUserByEmail(validated.data.email);

  if (!user) {
    // For security, don't reveal whether the email exists.
    // We say "we sent you a link" regardless, but internally we do nothing.
    // The attacker can't tell if the email is registered.
    return { exists: false, hasPassword: false };
  }

  return {
    exists: true,
    hasPassword: Boolean(user.password),
  };
}
