// lib/notifications/sendSwapClaimedEmails.ts
"use server";

import { db } from "@/lib/db";
import { Resend } from "resend";
import { buildSwapClaimedEmail } from "@/lib/emails/swapClaimed";
import { formatShiftFullDate } from "@/lib/shifts/formatShift";
import { formatPhone } from "@/lib/format";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendResult = {
  requesterNotified: boolean;
  claimerNotified: boolean;
  errors: string[];
};

/**
 * Sends two emails when a swap is claimed:
 *   1. To the requester: "Great news, Mike took your shift"
 *   2. To the claimer:   "Thanks for stepping in — here's the details"
 *
 * Called from actions/swaps/claimSwap.ts after the atomic claim succeeds.
 * Both emails are best-effort — if one fails, the other still tries.
 */
export async function sendSwapClaimedEmails({
  swapRequestId,
}: {
  swapRequestId: string;
}): Promise<SendResult> {
  const result: SendResult = {
    requesterNotified: false,
    claimerNotified: false,
    errors: [],
  };

  // Load the claimed request + everyone involved
  const swapRequest = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    include: {
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          email: true,
          emailOptIn: true,
        },
      },
      claimedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          emailOptIn: true,
        },
      },
      shift: {
        include: {
          circle: {
            select: {
              id: true,
              name: true,
              address: true,
              typicalArrivalTime: true,
              recipient: {
                select: { firstName: true },
              },
            },
          },
          groceryItems: {
            where: {
              status: { in: ["PENDING", "ASSIGNED"] },
            },
            select: {
              name: true,
              quantity: true,
              notes: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!swapRequest) {
    result.errors.push("Swap request not found");
    return result;
  }

  if (swapRequest.status !== "CLAIMED" || !swapRequest.claimedBy) {
    result.errors.push(`Swap not in CLAIMED state (is ${swapRequest.status})`);
    return result;
  }

  const shift = swapRequest.shift;
  const circle = shift.circle;
  const requester = swapRequest.requestedBy;
  const claimer = swapRequest.claimedBy;
  const careRecipientFirstName = circle.recipient?.firstName ?? "your friend";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shiftUrl = `${baseUrl}/circles/${circle.id}/shifts/${shift.id}`;
  const shiftDateFull = formatShiftFullDate(shift.scheduledDate);
  const claimerPhoneFormatted = claimer.phone
    ? formatPhone(claimer.phone)
    : null;

  // ——— Email 1: the requester ———

  if (requester.emailOptIn) {
    const logRow = await db.notificationLog.create({
      data: {
        userId: requester.id,
        shiftId: shift.id,
        channel: "EMAIL",
        template: `swap_claimed_requester_${swapRequestId}`,
        status: "PENDING",
      },
    });

    try {
      const { subject, html, text } = buildSwapClaimedEmail({
        perspective: "requester",
        requesterFirstName: requester.firstName,
        claimerFirstName: claimer.firstName,
        claimerLastName: claimer.lastName,
        claimerPhone: claimerPhoneFormatted,
        circleName: circle.name,
        careRecipientFirstName,
        shiftDateFull,
        typicalArrivalTime: circle.typicalArrivalTime,
        address: circle.address,
        groceryItems: [], // not used for requester
        shiftUrl,
      });

      const sendResult = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: requester.email,
        subject,
        html,
        text,
      });

      if (sendResult.error) {
        await db.notificationLog.update({
          where: { id: logRow.id },
          data: {
            status: "FAILED",
            error: JSON.stringify(sendResult.error),
          },
        });
        result.errors.push(
          `Requester email failed: ${JSON.stringify(sendResult.error)}`,
        );
      } else {
        await db.notificationLog.update({
          where: { id: logRow.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });
        result.requesterNotified = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.notificationLog.update({
        where: { id: logRow.id },
        data: { status: "FAILED", error: message },
      });
      result.errors.push(`Requester email error: ${message}`);
    }
  }

  // ——— Email 2: the claimer ———

  if (claimer.emailOptIn) {
    const logRow = await db.notificationLog.create({
      data: {
        userId: claimer.id,
        shiftId: shift.id,
        channel: "EMAIL",
        template: `swap_claimed_claimer_${swapRequestId}`,
        status: "PENDING",
      },
    });

    try {
      const { subject, html, text } = buildSwapClaimedEmail({
        perspective: "claimer",
        requesterFirstName: requester.firstName,
        claimerFirstName: claimer.firstName,
        claimerLastName: claimer.lastName,
        claimerPhone: null, // claimer doesn't need their own phone
        circleName: circle.name,
        careRecipientFirstName,
        shiftDateFull,
        typicalArrivalTime: circle.typicalArrivalTime,
        address: circle.address,
        groceryItems: shift.groceryItems,
        shiftUrl,
      });

      const sendResult = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: claimer.email,
        subject,
        html,
        text,
      });

      if (sendResult.error) {
        await db.notificationLog.update({
          where: { id: logRow.id },
          data: {
            status: "FAILED",
            error: JSON.stringify(sendResult.error),
          },
        });
        result.errors.push(
          `Claimer email failed: ${JSON.stringify(sendResult.error)}`,
        );
      } else {
        await db.notificationLog.update({
          where: { id: logRow.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });
        result.claimerNotified = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.notificationLog.update({
        where: { id: logRow.id },
        data: { status: "FAILED", error: message },
      });
      result.errors.push(`Claimer email error: ${message}`);
    }
  }

  console.log(
    `[sendSwapClaimedEmails] Swap ${swapRequestId}: requester=${result.requesterNotified}, claimer=${result.claimerNotified}`,
  );

  return result;
}
