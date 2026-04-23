// app/api/cron/send-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendShiftReminder } from "@/lib/notifications/sendShiftReminder";
import { ensureShiftsForCircle } from "@/lib/shifts/generateShifts";
import { archiveExpiredCircles } from "@/lib/circles/archiveExpiredCircles";

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
      reminderDaysBefore: true,
    },
  });

  let shiftsEvaluated = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const circle of circles) {
    // Keep shift windows healthy for every active circle
    try {
      await ensureShiftsForCircle(circle.id, 16);
    } catch (err) {
      console.error(
        `[cron] ensureShiftsForCircle failed for ${circle.id}:`,
        err,
      );
    }

    const reminderDays = circle.reminderDaysBefore.filter(
      (d) => d === 7 || d === 2 || d === 1,
    );

    for (const daysBefore of reminderDays) {
      const targetStart = new Date();
      targetStart.setDate(targetStart.getDate() + daysBefore);
      targetStart.setHours(0, 0, 0, 0);

      const targetEnd = new Date(targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      const shifts = await db.shift.findMany({
        where: {
          circleId: circle.id,
          scheduledDate: { gte: targetStart, lte: targetEnd },
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        },
        select: { id: true },
      });

      for (const shift of shifts) {
        shiftsEvaluated++;
        const result = await sendShiftReminder({
          shiftId: shift.id,
          daysBefore: daysBefore as 7 | 2 | 1,
        });
        if (result.status === "sent") sent++;
        else if (result.status === "skipped") skipped++;
        else failed++;
      }
    }
  }

  return NextResponse.json({
    circlesProcessed: circles.length,
    shiftsEvaluated,
    sent,
    skipped,
    failed,
    archive: archiveResult,
  });
}
