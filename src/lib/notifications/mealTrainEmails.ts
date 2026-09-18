// lib/notifications/mealTrainEmails.ts
//
// Senders for the meal train emails (templates live in lib/emails/mealTrain.ts).
// Every send is recorded in NotificationLog, same as shift reminders.
import { db } from "@/lib/db";
import { Resend } from "resend";
import {
  buildMealDayReleasedEmail,
  buildMealOpenDaysEmail,
  buildMealSignupEmail,
  buildMealSignupRecipientEmail,
  type MealDropoff,
  type MealHousehold,
} from "@/lib/emails/mealTrain";
import { formatCircleAddressOneLine } from "@/lib/circles/formatAddress";
import { formatPhone } from "@/lib/format";
import { formatShiftFullDate } from "@/lib/shifts/formatShift";
import {
  addDaysToKey,
  currentShiftDayKey,
  daysBetweenKeys,
  shiftDayCutoff,
  toDateKey,
} from "@/lib/shifts/scheduleDates";

const resend = new Resend(process.env.RESEND_API_KEY);

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// ─────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────

type CircleAddressFields = {
  address: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  accessNotes: string | null;
  typicalArrivalTime: string | null;
};

export function buildDropoff(circle: CircleAddressFields): MealDropoff {
  const addressOneLine = formatCircleAddressOneLine(circle);
  return {
    addressOneLine,
    mapsUrl: addressOneLine
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressOneLine)}`
      : null,
    accessNotes: circle.accessNotes,
    dropoffTime: circle.typicalArrivalTime,
  };
}

export function buildHousehold(circle: {
  mealHouseholdSize: string | null;
  mealAllergies: string | null;
  mealPreferences: string | null;
}): MealHousehold {
  return {
    householdSize: circle.mealHouseholdSize,
    allergies: circle.mealAllergies,
    preferences: circle.mealPreferences,
  };
}

/** Log → send → mark SENT/FAILED. Never throws. */
async function sendLogged({
  userId,
  shiftId,
  template,
  to,
  subject,
  html,
  text,
}: {
  userId: string;
  shiftId: string | null;
  template: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const logRow = await db.notificationLog.create({
    data: { userId, shiftId, channel: "EMAIL", template, status: "PENDING" },
  });

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      await db.notificationLog.update({
        where: { id: logRow.id },
        data: { status: "FAILED", error: JSON.stringify(result.error) },
      });
      return false;
    }

    await db.notificationLog.update({
      where: { id: logRow.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return true;
  } catch (err) {
    await db.notificationLog.update({
      where: { id: logRow.id },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return false;
  }
}

async function getActiveJoinUrl(circleId: string): Promise<string | null> {
  const link = await db.circleJoinLink.findFirst({
    where: {
      circleId,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: { token: true },
  });
  return link ? `${baseUrl()}/join/${link.token}` : null;
}

async function getOrganizers(circleId: string, excludeUserId?: string) {
  const admins = await db.circleMembership.findMany({
    where: {
      circleId,
      active: true,
      role: "ADMIN",
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: {
      user: {
        select: { id: true, firstName: true, email: true, emailOptIn: true },
      },
    },
  });
  return admins.map((a) => a.user).filter((u) => u.emailOptIn);
}

// ─────────────────────────────────────────────
// 1. Someone signed up → the helper AND the person receiving the meals
// ─────────────────────────────────────────────

/**
 * Called from every sign-up path (the calendar button and both invite-page
 * flows), once per sign-up ACTION — so someone who takes three days at once
 * produces one email to each person, listing all three days.
 *
 *   → the helper:    "You're on the calendar" + address, household, drop-off
 *   → the recipient: "Maria is bringing you a meal on Tuesday" + what, and
 *                    Maria's number in case plans change
 *
 * The two sends are independent: one person having emails turned off (or one
 * send failing) never stops the other.
 */
export async function sendMealSignupEmail({
  userId,
  circleId,
  shiftIds,
}: {
  userId: string;
  circleId: string;
  shiftIds: string[];
}): Promise<void> {
  if (shiftIds.length === 0) return;

  try {
    const [user, circle, shifts] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          emailOptIn: true,
        },
      }),
      db.careCircle.findUnique({
        where: { id: circleId },
        include: {
          recipient: {
            select: {
              id: true,
              firstName: true,
              email: true,
              emailOptIn: true,
            },
          },
        },
      }),
      db.shift.findMany({
        where: { id: { in: shiftIds }, circleId, assignedUserId: userId },
        orderBy: { scheduledDate: "asc" },
        select: {
          id: true,
          scheduledDate: true,
          mealDescription: true,
          mealNotes: true,
        },
      }),
    ]);

    if (!user || !circle || shifts.length === 0) return;

    const circleUrl = `${baseUrl()}/circles/${circle.id}`;
    const recipient = circle.recipient;

    // ——— To the helper ———
    if (user.emailOptIn) {
      const { subject, html, text } = buildMealSignupEmail({
        helperFirstName: user.firstName,
        recipientFirstName: recipient?.firstName ?? "your friend",
        circleName: circle.name,
        days: shifts.map((s) => ({
          dateFull: formatShiftFullDate(s.scheduledDate),
          mealDescription: s.mealDescription,
          url: `${circleUrl}/shifts/${s.id}`,
        })),
        household: buildHousehold(circle),
        dropoff: buildDropoff(circle),
        circleUrl,
      });

      await sendLogged({
        userId: user.id,
        shiftId: shifts[0].id,
        template: "meal_signup",
        to: user.email,
        subject,
        html,
        text,
      });
    }

    // ——— To the person receiving the meals ———
    if (recipient && recipient.emailOptIn && recipient.id !== user.id) {
      const { subject, html, text } = buildMealSignupRecipientEmail({
        recipientFirstName: recipient.firstName,
        helperFirstName: user.firstName,
        helperLastName: user.lastName,
        helperPhone: user.phone ? formatPhone(user.phone) : null,
        circleName: circle.name,
        days: shifts.map((s) => ({
          dateFull: formatShiftFullDate(s.scheduledDate),
          mealDescription: s.mealDescription,
          mealNotes: s.mealNotes,
        })),
        dropoffTime: circle.typicalArrivalTime,
        pageUrl: `${baseUrl()}/my-circle?circle=${circle.id}`,
      });

      await sendLogged({
        userId: recipient.id,
        shiftId: shifts[0].id,
        template: "meal_signup_recipient",
        to: recipient.email,
        subject,
        html,
        text,
      });
    }
  } catch (err) {
    console.error("[sendMealSignupEmail] failed:", err);
  }
}

// ─────────────────────────────────────────────
// 2. A claimed day was given back
// ─────────────────────────────────────────────

/**
 * • Helper released their own day  → tell the organizers it's open again.
 * • Organizer took a helper off    → tell that helper (and any other organizers).
 */
export async function sendMealDayReleasedEmails({
  shiftId,
  circleId,
  scheduledDate,
  releasedUserId,
  actorId,
}: {
  shiftId: string;
  circleId: string;
  scheduledDate: Date;
  releasedUserId: string;
  actorId: string;
}): Promise<void> {
  try {
    const [circle, released, actor] = await Promise.all([
      db.careCircle.findUnique({
        where: { id: circleId },
        select: {
          id: true,
          name: true,
          recipient: { select: { firstName: true } },
        },
      }),
      db.user.findUnique({
        where: { id: releasedUserId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          emailOptIn: true,
        },
      }),
      db.user.findUnique({
        where: { id: actorId },
        select: { id: true, firstName: true },
      }),
    ]);

    if (!circle || !released) return;

    const dateFull = formatShiftFullDate(scheduledDate);
    const circleUrl = `${baseUrl()}/circles/${circle.id}`;
    const recipientFirstName = circle.recipient?.firstName ?? "your friend";
    const byOrganizer = actorId !== releasedUserId;

    // Tell the helper when someone else removed them
    if (byOrganizer && released.emailOptIn) {
      const email = buildMealDayReleasedEmail({
        audience: "helper",
        toFirstName: released.firstName,
        organizerFirstName: actor?.firstName ?? "The organizer",
        recipientFirstName,
        circleName: circle.name,
        dateFull,
        circleUrl,
      });
      await sendLogged({
        userId: released.id,
        shiftId,
        template: `meal_released_helper_${shiftId}`,
        to: released.email,
        ...email,
      });
    }

    // Tell the organizers (minus whoever did it — they already know)
    const organizers = await getOrganizers(circleId, actorId);
    if (organizers.length === 0) return;

    const joinUrl = await getActiveJoinUrl(circleId);
    for (const organizer of organizers) {
      const email = buildMealDayReleasedEmail({
        audience: "organizer",
        toFirstName: organizer.firstName,
        helperName: `${released.firstName} ${released.lastName}`.trim(),
        recipientFirstName,
        circleName: circle.name,
        dateFull,
        circleUrl,
        joinUrl,
      });
      await sendLogged({
        userId: organizer.id,
        shiftId,
        template: `meal_released_${shiftId}`,
        to: organizer.email,
        ...email,
      });
    }
  } catch (err) {
    console.error("[sendMealDayReleasedEmails] failed:", err);
  }
}

// ─────────────────────────────────────────────
// 3. Open days coming up → organizers (daily cron)
// ─────────────────────────────────────────────

const NUDGE_TRIGGER_DAYS = [3, 1]; // a day that is exactly 3 or 1 days out and still open
const NUDGE_LOOKAHEAD_DAYS = 7; // …triggers one digest listing every open day this week

function relativeLabel(daysAway: number, date: Date): string {
  if (daysAway <= 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  return daysAway <= 6 ? `This ${weekday}` : `Next ${weekday}`;
}

/**
 * At most ONE email per organizer per day, and only on days when something
 * close (3 days or 1 day out) is still unclaimed. The digest lists every open
 * day in the coming week so the organizer sees the whole picture at once.
 */
export async function sendOpenDayNudges(
  circleId: string,
): Promise<{ sent: number; openDays: number }> {
  const todayKey = currentShiftDayKey();
  const untilKey = addDaysToKey(todayKey, NUDGE_LOOKAHEAD_DAYS);

  const openShifts = await db.shift.findMany({
    where: {
      circleId,
      assignedUserId: null,
      status: "SCHEDULED",
      scheduledDate: {
        gt: shiftDayCutoff(),
        lte: new Date(`${untilKey}T23:59:59.999Z`),
      },
    },
    orderBy: { scheduledDate: "asc" },
    select: { id: true, scheduledDate: true },
  });

  if (openShifts.length === 0) return { sent: 0, openDays: 0 };

  const withDistance = openShifts.map((s) => ({
    ...s,
    daysAway: daysBetweenKeys(todayKey, toDateKey(s.scheduledDate)),
  }));

  const triggered = withDistance.some((s) =>
    NUDGE_TRIGGER_DAYS.includes(s.daysAway),
  );
  if (!triggered) return { sent: 0, openDays: openShifts.length };

  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    select: {
      id: true,
      name: true,
      recipient: { select: { firstName: true } },
    },
  });
  if (!circle) return { sent: 0, openDays: openShifts.length };

  const organizers = await getOrganizers(circleId);
  const joinUrl = await getActiveJoinUrl(circleId);
  const template = `meal_open_days_${todayKey}`;
  let sent = 0;

  for (const organizer of organizers) {
    // Idempotent per organizer per day — safe if the cron fires twice
    const already = await db.notificationLog.findFirst({
      where: {
        userId: organizer.id,
        template,
        shift: { circleId },
      },
      select: { id: true },
    });
    if (already) continue;

    const email = buildMealOpenDaysEmail({
      toFirstName: organizer.firstName,
      recipientFirstName: circle.recipient?.firstName ?? "your friend",
      circleName: circle.name,
      openDays: withDistance.map((s) => ({
        dateFull: formatShiftFullDate(s.scheduledDate),
        relative: relativeLabel(s.daysAway, s.scheduledDate),
      })),
      circleUrl: `${baseUrl()}/circles/${circle.id}`,
      joinUrl,
    });

    const ok = await sendLogged({
      userId: organizer.id,
      shiftId: withDistance[0].id,
      template,
      to: organizer.email,
      ...email,
    });
    if (ok) sent++;
  }

  return { sent, openDays: openShifts.length };
}
