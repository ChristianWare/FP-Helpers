// actions/auth/sendMagicLink.ts
"use server";

import { signIn } from "../../../auth";

export async function sendMagicLink(email: string) {
  try {
    await signIn("nodemailer", {
      email: email.toLowerCase().trim(),
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    console.error("[sendMagicLink] Error:", error);
    return { error: "Failed to send sign-in link. Please try again." };
  }
}
