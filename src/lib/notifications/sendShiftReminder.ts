// lib/notifications/sendShiftReminder.ts
"use server";

import { db } from "@/lib/db";
import { Resend } from "resend";
import { buildShiftReminderEmail } from "@/lib/emails/shiftReminder";
import { formatShiftFullDate } from "@/lib/shifts/formatShift";

const resend = new Resend(process.env.RESEND_API_KEY);

type DaysBefore = 7 | 2 | 1;

type SendResult =
  | { status: "sent"; logId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Build the template key used to identify a specific reminder in NotificationLog.
 * Format: "shift_reminder_t{daysBefore}" — e.g. "shift_reminder_t7"
 */
function templateKey(daysBefore: DaysBefore): string {
  return `shift_reminder_t${daysBefore}`;
}

/**
 * Build the "short date" phrase used in subjects and headlines.
 * 1 day  → "Tomorrow"
 * 2 days → "This Saturday" (day of week)
 * 7 days → "Next Saturday"
 */
function shortDatePhrase(daysBefore: DaysBefore, scheduledDate: Date): string {
  const weekday = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  if (daysBefore === 1) return "Tomorrow";
  if (daysBefore === 2) return `This ${weekday}`;
  return `Next ${weekday}`;
}

/**
 * Send a shift reminder email to the assigned helper.
 * Idempotent: checks NotificationLog first and skips if the same template
 * has already been sent for this user+shift.
 *
 * Pass `force: true` to bypass the idempotency check (for manual "send me a test" buttons).
 */
export async function sendShiftReminder({
  shiftId,
  daysBefore,
  force = false,
}: {
  shiftId: string;
  daysBefore: DaysBefore;
  force?: boolean;
}): Promise<SendResult> {
  const template = templateKey(daysBefore);

  // 1. Load the shift with everything we need for the email
  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    include: {
      assignedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          emailOptIn: true,
        },
      },
      circle: {
        include: {
          recipient: {
            select: { firstName: true, lastName: true },
          },
          prescriptions: {
            where: { active: true },
            select: {
              medicationName: true,
              needsPickupThisWeek: true,
              defaultPharmacy: {
                select: { name: true },
              },
            },
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
  });

  // 2. Guard against missing data
  if (!shift) {
    return { status: "skipped", reason: "Shift not found" };
  }

  if (!shift.assignedUser) {
    return { status: "skipped", reason: "Shift has no assigned helper" };
  }

  if (shift.status !== "SCHEDULED" && shift.status !== "IN_PROGRESS") {
    return {
      status: "skipped",
      reason: `Shift status is ${shift.status} — not eligible for reminders`,
    };
  }

  if (!shift.assignedUser.emailOptIn) {
    return {
      status: "skipped",
      reason: "Helper has opted out of email notifications",
    };
  }

  // 3. Idempotency check — has this reminder already been sent?
  if (!force) {
    const existing = await db.notificationLog.findFirst({
      where: {
        userId: shift.assignedUser.id,
        shiftId: shift.id,
        template,
        status: { in: ["SENT", "DELIVERED"] },
      },
    });

    if (existing) {
      return {
        status: "skipped",
        reason: `Already sent on ${existing.sentAt?.toISOString() ?? "unknown date"}`,
      };
    }
  }

  // 4. Build the email
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shiftUrl = `${baseUrl}/circles/${shift.circleId}/shifts/${shift.id}`;
  const mapsUrl = shift.circle.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shift.circle.address)}`
    : null;

  const { subject, html, text } = buildShiftReminderEmail({
    helperFirstName: shift.assignedUser.firstName,
    recipientFirstName: shift.circle.recipient?.firstName ?? "your friend",
    recipientLastName: shift.circle.recipient?.lastName ?? "",
    circleName: shift.circle.name,
    daysBefore,
    shiftDateFull: formatShiftFullDate(shift.scheduledDate),
    shiftDateShort: shortDatePhrase(daysBefore, shift.scheduledDate),
    typicalArrivalTime: shift.circle.typicalArrivalTime,
    address: shift.circle.address,
    accessNotes: shift.circle.accessNotes,
    groceryItems: shift.groceryItems,
    prescriptions: shift.circle.prescriptions.map((p) => ({
      medicationName: p.medicationName,
      pharmacyName: p.defaultPharmacy?.name ?? null,
      needsPickupThisWeek: p.needsPickupThisWeek,
    })),
    emergencyContact: shift.circle.emergencyContact,
    emergencyPhone: shift.circle.emergencyPhone,
    shiftUrl,
    mapsUrl,
  });

  // 5. Create a PENDING log row first — if send fails, we still have a record
  const logRow = await db.notificationLog.create({
    data: {
      userId: shift.assignedUser.id,
      shiftId: shift.id,
      channel: "EMAIL",
      template,
      status: "PENDING",
    },
  });

  // 6. Send via Resend
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: shift.assignedUser.email,
      subject,
      html,
      text,
    });

    if (result.error) {
      await db.notificationLog.update({
        where: { id: logRow.id },
        data: {
          status: "FAILED",
          error: JSON.stringify(result.error),
        },
      });
      return {
        status: "failed",
        error: `Resend error: ${JSON.stringify(result.error)}`,
      };
    }

    // Success
    await db.notificationLog.update({
      where: { id: logRow.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return { status: "sent", logId: logRow.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await db.notificationLog.update({
      where: { id: logRow.id },
      data: {
        status: "FAILED",
        error: message,
      },
    });

    return { status: "failed", error: message };
  }
}
