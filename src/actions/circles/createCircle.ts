/* eslint-disable @typescript-eslint/no-unused-vars */
// actions/circles/createCircle.ts
"use server";

import { auth, signIn } from "../../../auth";
import { db } from "@/lib/db";
import {
  CreateCircleSchema,
  CreateCircleSchemaType,
} from "@/schemas/CreateCircleSchema";
import { generateToken } from "@/lib/tokens";
import { getUserByEmail } from "@/lib/user";
import { Resend } from "resend";
import { buildCircleWelcomeEmail } from "@/lib/emails/circleWelcome";

const resend = new Resend(process.env.RESEND_API_KEY);

export const createCircle = async (values: CreateCircleSchemaType) => {
  // 1. Ensure caller is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to create a circle" };
  }

  // 2. Validate input
  const validated = CreateCircleSchema.safeParse(values);
  if (!validated.success) {
    return {
      error: "Some of your information looks off. Please check and try again.",
    };
  }

  const {
    circleName,
    recipientFirstName,
    recipientLastName,
    recipientEmail,
    recipientPhone,
    address,
    accessNotes,
    rotationDayOfWeek,
    rotationCadence,
    typicalArrivalTime,
    organizerInRotation,
  } = validated.data;

  const normalizedRecipientEmail = recipientEmail.toLowerCase().trim();
  const normalizedRecipientPhone = recipientPhone.replace(/\D/g, "");

  // 3. Don't let the organizer set themselves as the recipient
  if (normalizedRecipientEmail === session.user.email?.toLowerCase()) {
    return {
      error:
        "You can't create a circle for yourself. Ask a friend to set one up for you.",
    };
  }

  // 4. Check if the recipient email already belongs to someone
  const existingRecipient = await getUserByEmail(normalizedRecipientEmail);

  // 5. Generate the shareable join link token
  const joinToken = generateToken();

  // 6. Do all the database writes in a single transaction
  let circleId: string;
  let recipientId: string;

  try {
    const result = await db.$transaction(async (tx) => {
      // Create or reuse recipient user
      let recipient;
      if (existingRecipient) {
        recipient = existingRecipient;
      } else {
        recipient = await tx.user.create({
          data: {
            firstName: recipientFirstName.trim(),
            lastName: recipientLastName.trim(),
            email: normalizedRecipientEmail,
            phone: normalizedRecipientPhone,
            password: null, // magic-link only
            emailVerified: new Date(), // the welcome email they'll click counts as verification
          },
        });
      }

      // Create the circle
      const circle = await tx.careCircle.create({
        data: {
          name: circleName.trim(),
          recipientId: recipient.id,
          address: address?.trim() || null,
          accessNotes: accessNotes?.trim() || null,
          rotationDayOfWeek,
          rotationCadence,
          typicalArrivalTime: typicalArrivalTime?.trim() || null,
        },
      });

      // Add recipient as RECIPIENT membership (not in rotation)
      await tx.circleMembership.create({
        data: {
          userId: recipient.id,
          circleId: circle.id,
          role: "RECIPIENT",
          inRotation: false,
        },
      });

      // Add organizer as ADMIN membership
      await tx.circleMembership.create({
        data: {
          userId: session.user.id!,
          circleId: circle.id,
          role: "ADMIN",
          inRotation: organizerInRotation,
        },
      });

      // Create the shareable join link
      await tx.circleJoinLink.create({
        data: {
          circleId: circle.id,
          token: joinToken,
          role: "HELPER",
          active: true,
          createdById: session.user.id,
        },
      });

      return { circleId: circle.id, recipientId: recipient.id };
    });

    circleId = result.circleId;
    recipientId = result.recipientId;
  } catch (error) {
    console.error("[createCircle] Transaction error:", error);
    return {
      error: "Something went wrong setting up the circle. Please try again.",
    };
  }

  // 7. Send the welcome email to the recipient with a magic link
  //    (only if they're a new user — existing users already have access)
  if (!existingRecipient) {
    try {
      // Trigger NextAuth's magic-link flow, which sends via our Nodemailer/Resend provider
      await signIn("nodemailer", {
        email: normalizedRecipientEmail,
        redirect: false,
        redirectTo: "/my-circle",
      });
    } catch (error) {
      // Email failure shouldn't roll back circle creation — the organizer can resend later
      console.error("[createCircle] Welcome email failed:", error);
    }

    // ALSO send a branded "welcome to the circle" email (different from the raw magic-link email)
    // We use the same magic-link URL the user will get — a little redundant but gives them
    // context about what the circle is. For now, skip this and just rely on the magic link
    // above. We can add a proper welcome email in a later pass.
  }

  return {
    success: true,
    circleId,
  };
};
