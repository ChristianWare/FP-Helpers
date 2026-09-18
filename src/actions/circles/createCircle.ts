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
import {
  currentShiftDayKey,
  dateInputToEnd,
  dateInputToStart,
  dateKeyToNoonUtc,
  firstOccurrenceKey,
  resolveScheduleDays,
} from "@/lib/shifts/scheduleDates";
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
    circleType,
    listedInDirectory,
    circleName,
    recipientFirstName,
    recipientLastName,
    recipientEmail,
    recipientPhone,
    recipientPassword,
    address,
    addressCity,
    addressState,
    addressZip,
    accessNotes,
    rotationCadence,
    typicalArrivalTime,
    durationType,
    startDate,
    endDate,
    mealHouseholdSize,
    mealAllergies,
    mealPreferences,
  } = validated.data;

  const isMealTrain = circleType === "MEAL_TRAIN";

  // In a meal train nobody is "in the rotation" — people pick their own days.
  const organizerInRotation = isMealTrain
    ? false
    : validated.data.organizerInRotation;

  // "Every day" / "One day a week" / "Several days a week" → the stored array
  const rotationDaysOfWeek = resolveScheduleDays(validated.data);
  if (rotationDaysOfWeek.length === 0) {
    return { error: "Please pick at least one day of the week." };
  }

  const isFixed = durationType === "FIXED";
  const startAt = isFixed && startDate ? dateInputToStart(startDate) : null;
  const endAt = isFixed && endDate ? dateInputToEnd(endDate) : null;

  // The first real visit — anchors "every other week" so it can never drift.
  const todayKey = currentShiftDayKey();
  const scheduleFromKey =
    isFixed && startDate && startDate > todayKey ? startDate : todayKey;
  const scheduleAnchorDate = dateKeyToNoonUtc(
    firstOccurrenceKey(rotationDaysOfWeek, scheduleFromKey),
  );

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
          addressCity: addressCity?.trim() || null,
          addressState: addressState?.trim() || null,
          addressZip: addressZip?.trim() || null,
          accessNotes: accessNotes?.trim() || null,
          circleType,
          listedInDirectory,
          rotationDaysOfWeek,
          rotationDayOfWeek: rotationDaysOfWeek[0], // legacy column, kept in sync
          rotationCadence,
          scheduleAnchorDate,
          typicalArrivalTime: typicalArrivalTime?.trim() || null,
          durationType,
          startDate: startAt,
          endDate: endAt,
          mealHouseholdSize: isMealTrain
            ? mealHouseholdSize?.trim() || null
            : null,
          mealAllergies: isMealTrain ? mealAllergies?.trim() || null : null,
          mealPreferences: isMealTrain ? mealPreferences?.trim() || null : null,
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

  // Tell the recipient. If they already had an account, the password typed
  // into the wizard was NOT applied (we never overwrite someone's password),
  // so that version of the email tells them to sign in the way they always do.
  try {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

    const { subject, html, text } = buildCircleWelcomeEmail({
      recipientFirstName: existingRecipient
        ? existingRecipient.firstName
        : recipientFirstName.trim(),
      recipientEmail: normalizedRecipientEmail,
      recipientPassword: existingRecipient ? null : recipientPassword,
      organizerFirstName: session.user.firstName ?? "Your friend",
      organizerLastName: session.user.lastName ?? "",
      circleName: circleName.trim(),
      loginUrl,
      circleType,
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

  revalidatePath("/dashboard");
  revalidatePath(`/circles/${circleId}`);
  revalidatePath("/admin");

  return {
    success: true,
    circleId,
    // Lets the success banner explain why the password wasn't used
    recipientHadAccount: !!existingRecipient,
  };
};
