// app/api/cron/send-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendShiftReminder } from "@/lib/notifications/sendShiftReminder";
import { sendOpenDayNudges } from "@/lib/notifications/mealTrainEmails";
import { ensureShiftsForCircle } from "@/lib/shifts/generateShifts";
import { archiveExpiredCircles } from "@/lib/circles/archiveExpiredCircles";
import { effectiveReminderDays } from "@/lib/shifts/reminderDays";
import { addDaysToKey, currentShiftDayKey } from "@/lib/shifts/scheduleDates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // First: archive expired FIXED-duration circles + send completion emails
  const archiveResult = await archiveExpiredCircles();

  const circles = await db.careCircle.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      circleType: true,
      rotationCadence: true,
      rotationDaysOfWeek: true,
      rotationDayOfWeek: true,
      reminderDaysBefore: true,
    },
  });

  let shiftsEvaluated = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let openDayNudges = 0;

  const todayKey = currentShiftDayKey();

  for (const circle of circles) {
    // Keep shift windows healthy for every active circle
    // (rotations get assigned shifts, meal trains get open days)
    try {
      await ensureShiftsForCircle(circle.id, 16);
    } catch (err) {
      console.error(
        `[cron] ensureShiftsForCircle failed for ${circle.id}:`,
        err,
      );
    }

    // 7 / 2 / 1 days before — trimmed to day-before-only for rotations that
    // run 3+ days a week, where three emails per shift would be near-daily.
    const reminderDays = effectiveReminderDays(circle);

    for (const daysBefore of reminderDays) {
      // Shifts are stored at 12:00 UTC on their calendar day, so match the
      // whole UTC day of the target date.
      const targetKey = addDaysToKey(todayKey, daysBefore);

      const shifts = await db.shift.findMany({
        where: {
          circleId: circle.id,
          scheduledDate: {
            gte: new Date(`${targetKey}T00:00:00.000Z`),
            lte: new Date(`${targetKey}T23:59:59.999Z`),
          },
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          // Unclaimed meal train days have nobody to remind
          assignedUserId: { not: null },
        },
        select: { id: true },
      });

      for (const shift of shifts) {
        shiftsEvaluated++;
        const result = await sendShiftReminder({
          shiftId: shift.id,
          daysBefore,
        });
        if (result.status === "sent") sent++;
        else if (result.status === "skipped") skipped++;
        else failed++;
      }
    }

    // Meal trains: tell the organizers when a day that's close is still open
    if (circle.circleType === "MEAL_TRAIN") {
      try {
        const nudge = await sendOpenDayNudges(circle.id);
        openDayNudges += nudge.sent;
      } catch (err) {
        console.error(`[cron] sendOpenDayNudges failed for ${circle.id}:`, err);
      }
    }
  }

  return NextResponse.json({
    circlesProcessed: circles.length,
    shiftsEvaluated,
    sent,
    skipped,
    failed,
    openDayNudges,
    archive: archiveResult,
  });
}
