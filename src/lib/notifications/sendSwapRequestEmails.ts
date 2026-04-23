// lib/notifications/sendSwapRequestEmails.ts
"use server";

import { db } from "@/lib/db";
import { Resend } from "resend";
import { buildSwapRequestEmail } from "@/lib/emails/swapRequest";
import { formatShiftFullDate } from "@/lib/shifts/formatShift";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendResult = {
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{
    userId: string;
    result: "sent" | "skipped" | "failed";
    reason?: string;
  }>;
};

/**
 * Compute a relative date phrase like "This Saturday", "Next Saturday", "In 3 weeks".
 * Used to give the email headline some urgency context.
 */
function relativeDatePhrase(scheduledDate: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = new Date(scheduledDate);
  target.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysAway = Math.round((target.getTime() - now.getTime()) / msPerDay);

  const weekday = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  if (daysAway <= 0) return `Today`;
  if (daysAway === 1) return `Tomorrow`;
  if (daysAway <= 7) return `This ${weekday}`;
  if (daysAway <= 14) return `Next ${weekday}`;

  const weeksAway = Math.round(daysAway / 7);
  return `In ${weeksAway} weeks`;
}

/**
 * Send swap-request emails to every in-rotation helper in a circle
 * (excluding the requester). Idempotent per user+swapRequest — if this
 * is called twice, the second call skips anyone who already got an email.
 */
export async function sendSwapRequestEmails({
  swapRequestId,
}: {
  swapRequestId: string;
}): Promise<SendResult> {
  const result: SendResult = {
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  // 1. Load the swap request with everything we need
  const swapRequest = await db.swapRequest.findUnique({
    where: { id: swapRequestId },
    include: {
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
    console.error(
      `[sendSwapRequestEmails] Swap request not found: ${swapRequestId}`,
    );
    return result;
  }

  if (swapRequest.status !== "OPEN") {
    console.log(
      `[sendSwapRequestEmails] Swap request ${swapRequestId} is ${swapRequest.status}, not sending`,
    );
    return result;
  }

  const shift = swapRequest.shift;
  const circle = shift.circle;
  const requester = swapRequest.requestedBy;
  const careRecipientFirstName = circle.recipient?.firstName ?? "your friend";

  // 2. Find all eligible recipients: in-rotation helpers in the circle,
  //    excluding the requester, who have email opt-in enabled
  const memberships = await db.circleMembership.findMany({
    where: {
      circleId: circle.id,
      active: true,
      inRotation: true,
      role: { in: ["ADMIN", "HELPER"] },
      userId: { not: requester.id },
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          email: true,
          emailOptIn: true,
        },
      },
    },
  });

  if (memberships.length === 0) {
    console.log(
      `[sendSwapRequestEmails] No eligible recipients for swap ${swapRequestId}`,
    );
    return result;
  }

  // 3. Build shared email data
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shiftUrl = `${baseUrl}/circles/${circle.id}/shifts/${shift.id}`;
  // Same URL — the shift page will show "Take this shift" when there's an open swap
  const takeShiftUrl = shiftUrl;

  const shiftDateFull = formatShiftFullDate(shift.scheduledDate);
  const shiftDateRelative = relativeDatePhrase(shift.scheduledDate);
  const template = `swap_request_${swapRequestId}`;

  // 4. For each eligible helper: check idempotency, build + send, log
  for (const m of memberships) {
    const user = m.user;

    // Skip opt-outs
    if (!user.emailOptIn) {
      result.skipped++;
      result.details.push({
        userId: user.id,
        result: "skipped",
        reason: "User opted out of emails",
      });
      continue;
    }

    // Idempotency — have we already sent this swap notification to this user?
    const existing = await db.notificationLog.findFirst({
      where: {
        userId: user.id,
        shiftId: shift.id,
        template,
        status: { in: ["SENT", "DELIVERED"] },
      },
    });

    if (existing) {
      result.skipped++;
      result.details.push({
        userId: user.id,
        result: "skipped",
        reason: "Already notified about this swap",
      });
      continue;
    }

    // Create the log row first (PENDING), then try to send
    const logRow = await db.notificationLog.create({
      data: {
        userId: user.id,
        shiftId: shift.id,
        channel: "EMAIL",
        template,
        status: "PENDING",
      },
    });

    // Build the email
    const { subject, html, text } = buildSwapRequestEmail({
      recipientHelperFirstName: user.firstName,
      requesterFirstName: requester.firstName,
      requesterLastName: requester.lastName,
      requesterReason: swapRequest.reason,
      circleName: circle.name,
      careRecipientFirstName,
      shiftDateFull,
      shiftDateRelative,
      typicalArrivalTime: circle.typicalArrivalTime,
      address: circle.address,
      groceryItems: shift.groceryItems,
      shiftUrl,
      takeShiftUrl,
    });

    // Send
    try {
      const sendResult = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
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
        result.failed++;
        result.details.push({
          userId: user.id,
          result: "failed",
          reason: `Resend error: ${JSON.stringify(sendResult.error)}`,
        });
        continue;
      }

      await db.notificationLog.update({
        where: { id: logRow.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      result.sent++;
      result.details.push({ userId: user.id, result: "sent" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await db.notificationLog.update({
        where: { id: logRow.id },
        data: {
          status: "FAILED",
          error: message,
        },
      });

      result.failed++;
      result.details.push({
        userId: user.id,
        result: "failed",
        reason: message,
      });
    }
  }

  console.log(
    `[sendSwapRequestEmails] Swap ${swapRequestId}: sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`,
  );

  return result;
}
