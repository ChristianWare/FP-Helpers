// actions/circles/createCircle.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import {
  CreateCircleSchema,
  CreateCircleSchemaType,
} from "@/schemas/CreateCircleSchema";
import { generateToken } from "@/lib/tokens";
import { getUserByEmail } from "@/lib/user";
import { Resend } from "resend";
import { buildCircleWelcomeEmail } from "@/lib/emails/circleWelcome";
import {
  ensureShiftsForCircle,
  rebalanceShiftsForCircle,
} from "@/lib/shifts/generateShifts";
import bcryptjs from "bcryptjs";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY);

export const createCircle = async (values: CreateCircleSchemaType) => {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to create a circle" };
  }

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
    recipientPassword,
    address,
    accessNotes,
    rotationDayOfWeek,
    rotationCadence,
    typicalArrivalTime,
    durationType,
    startDate,
    endDate,
    organizerInRotation,
  } = validated.data;

  const normalizedRecipientEmail = recipientEmail.toLowerCase().trim();
  const normalizedRecipientPhone = recipientPhone.replace(/\D/g, "");

  if (normalizedRecipientEmail === session.user.email?.toLowerCase()) {
    return {
      error:
        "You can't create a circle for yourself. Ask a friend to set one up for you.",
    };
  }

  const existingRecipient = await getUserByEmail(normalizedRecipientEmail);
  const joinToken = generateToken();

  // Parse dates into Date objects (day-bounded)
  const parsedStartDate =
    durationType === "FIXED" && startDate ? new Date(startDate) : null;
  const parsedEndDate =
    durationType === "FIXED" && endDate ? new Date(endDate) : null;
  if (parsedStartDate) parsedStartDate.setHours(0, 0, 0, 0);
  if (parsedEndDate) parsedEndDate.setHours(23, 59, 59, 999);

  let circleId: string;

  try {
    const result = await db.$transaction(async (tx) => {
      let recipient;
      if (existingRecipient) {
        recipient = existingRecipient;
      } else {
        const hashedPassword = await bcryptjs.hash(recipientPassword, 10);
        recipient = await tx.user.create({
          data: {
            firstName: recipientFirstName.trim(),
            lastName: recipientLastName.trim(),
            email: normalizedRecipientEmail,
            phone: normalizedRecipientPhone,
            password: hashedPassword,
            emailVerified: new Date(),
          },
        });
      }

      const circle = await tx.careCircle.create({
        data: {
          name: circleName.trim(),
          recipientId: recipient.id,
          address: address?.trim() || null,
          accessNotes: accessNotes?.trim() || null,
          rotationDayOfWeek,
          rotationCadence,
          typicalArrivalTime: typicalArrivalTime?.trim() || null,
          durationType,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
        },
      });

      await tx.circleMembership.create({
        data: {
          userId: recipient.id,
          circleId: circle.id,
          role: "RECIPIENT",
          inRotation: false,
          rotationOrder: -1,
        },
      });

      await tx.circleMembership.create({
        data: {
          userId: session.user.id!,
          circleId: circle.id,
          role: "ADMIN",
          inRotation: organizerInRotation,
          rotationOrder: organizerInRotation ? 0 : -1,
        },
      });

      await tx.circleJoinLink.create({
        data: {
          circleId: circle.id,
          token: joinToken,
          role: "HELPER",
          active: true,
          createdById: session.user.id,
        },
      });

      return { circleId: circle.id };
    });

    circleId = result.circleId;
  } catch (error) {
    console.error("[createCircle] Transaction error:", error);
    return {
      error: "Something went wrong setting up the circle. Please try again.",
    };
  }

  try {
    await ensureShiftsForCircle(circleId);
    await rebalanceShiftsForCircle(circleId);
  } catch (err) {
    console.error("[createCircle] Failed to generate initial shifts:", err);
  }

  if (!existingRecipient) {
    try {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;
      const { subject, html, text } = buildCircleWelcomeEmail({
        recipientFirstName: recipientFirstName.trim(),
        recipientEmail: normalizedRecipientEmail,
        recipientPassword,
        organizerFirstName: session.user.firstName ?? "Your friend",
        organizerLastName: session.user.lastName ?? "",
        circleName: circleName.trim(),
        loginUrl,
      });

      const emailResult = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: normalizedRecipientEmail,
        subject,
        html,
        text,
      });

      if (emailResult.error) {
        console.error("[createCircle] Welcome email error:", emailResult.error);
      }
    } catch (error) {
      console.error("[createCircle] Welcome email failed:", error);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/admin");

  return { success: true, circleId };
};
