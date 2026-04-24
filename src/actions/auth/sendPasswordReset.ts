// actions/auth/sendPasswordReset.ts
"use server";

import { db } from "@/lib/db";
import {
  ForgotPasswordSchema,
  ForgotPasswordSchemaType,
} from "@/schemas/ForgotPasswordSchema";
import { generateToken } from "@/lib/tokens";
import { Resend } from "resend";
import { buildPasswordResetEmail } from "@/lib/emails/passwordReset";

const resend = new Resend(process.env.RESEND_API_KEY);

// Tokens expire after 1 hour
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export async function sendPasswordReset(values: ForgotPasswordSchemaType) {
  const validated = ForgotPasswordSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid email",
    };
  }

  // Honeypot — pretend success, send nothing
  if (validated.data.website) {
    return { success: true };
  }

  const normalizedEmail = validated.data.email.toLowerCase().trim();

  // Look up the user. We intentionally return success regardless of whether
  // they exist — this prevents email enumeration attacks.
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, firstName: true, email: true },
  });

  if (!user) {
    // Silently succeed
    return { success: true };
  }

  // Invalidate any existing unused reset tokens for this user — one at a time,
  // so an old email can't be used if they requested a new one.
  await db.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  await db.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const { subject, html, text } = buildPasswordResetEmail({
    firstName: user.firstName,
    resetUrl,
  });

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: user.email,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("[sendPasswordReset] Resend error:", result.error);
      // Still return success to the client — we don't want to leak which
      // emails are real
    }
  } catch (err) {
    console.error("[sendPasswordReset] Email send failed:", err);
  }

  return { success: true };
}
