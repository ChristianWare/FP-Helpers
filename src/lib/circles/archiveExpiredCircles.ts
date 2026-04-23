// lib/circles/archiveExpiredCircles.ts
"use server";

import { db } from "@/lib/db";
import { Resend } from "resend";
import { buildCircleCompletedEmail } from "@/lib/emails/circleCompleted";

const resend = new Resend(process.env.RESEND_API_KEY);

type ArchiveResult = {
  circlesArchived: number;
  emailsSent: number;
  errors: string[];
};

/**
 * Sweep for FIXED-duration circles whose endDate has passed,
 * flip them to ARCHIVED, and send completion emails to organizer + helpers.
 * Idempotent — uses completionEmailSentAt to avoid double-sends.
 */
export async function archiveExpiredCircles(): Promise<ArchiveResult> {
  const result: ArchiveResult = {
    circlesArchived: 0,
    emailsSent: 0,
    errors: [],
  };

  const now = new Date();

  // Find circles whose endDate has passed but are still ACTIVE
  const expiredCircles = await db.careCircle.findMany({
    where: {
      durationType: "FIXED",
      endDate: { lt: now },
      status: "ACTIVE",
    },
    include: {
      recipient: {
        select: { firstName: true, lastName: true },
      },
      memberships: {
        where: {
          active: true,
          role: { in: ["ADMIN", "HELPER"] },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              emailOptIn: true,
            },
          },
        },
      },
      shifts: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
  });

  for (const circle of expiredCircles) {
    try {
      // Flip status → ARCHIVED and stamp completion time
      await db.careCircle.update({
        where: { id: circle.id },
        data: {
          status: "ARCHIVED",
          completionEmailSentAt: circle.completionEmailSentAt ?? new Date(),
        },
      });
      result.circlesArchived++;

      // Only send emails once, even if cron runs multiple times
      if (circle.completionEmailSentAt) {
        continue;
      }

      // Build email data
      const careRecipientFirstName =
        circle.recipient?.firstName ?? "your friend";
      const careRecipientLastName = circle.recipient?.lastName ?? "";
      const startDate = circle.startDate ?? circle.createdAt;
      const endDate = circle.endDate!;
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksRun = Math.max(
        1,
        Math.round((endDate.getTime() - startDate.getTime()) / msPerWeek),
      );

      const helperNames = circle.memberships
        .filter((m) => m.role === "HELPER" || m.role === "ADMIN")
        .map((m) => m.user.firstName);

      const startDateLabel = startDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      const endDateLabel = endDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });

      // Send to every active member (organizer + helpers) who's opted in
      for (const m of circle.memberships) {
        if (!m.user.emailOptIn) continue;

        try {
          const { subject, html, text } = buildCircleCompletedEmail({
            recipientFirstName: m.user.firstName,
            careRecipientFirstName,
            careRecipientLastName,
            circleName: circle.name,
            startDateLabel,
            endDateLabel,
            weeksRun,
            totalShiftsCompleted: circle.shifts.length,
            helperNames,
            perspective: m.role === "ADMIN" ? "organizer" : "helper",
          });

          // Log it
          const logRow = await db.notificationLog.create({
            data: {
              userId: m.user.id,
              channel: "EMAIL",
              template: `circle_completed_${circle.id}`,
              status: "PENDING",
            },
          });

          const sendResult = await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: m.user.email,
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
              `Circle ${circle.id} email to ${m.user.email} failed: ${JSON.stringify(sendResult.error)}`,
            );
          } else {
            await db.notificationLog.update({
              where: { id: logRow.id },
              data: { status: "SENT", sentAt: new Date() },
            });
            result.emailsSent++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(
            `Circle ${circle.id} email error for ${m.user.email}: ${msg}`,
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Failed to archive circle ${circle.id}: ${msg}`);
      console.error(`[archiveExpiredCircles] Circle ${circle.id}:`, err);
    }
  }

  return result;
}
