// app/api/cron/send-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendShiftReminder } from "@/lib/notifications/sendShiftReminder";

// Vercel Cron invokes this with an Authorization header = "Bearer <CRON_SECRET>"
// For manual testing, you can hit it with the same header locally via curl.

type DaysBefore = 7 | 2 | 1;

export async function GET(req: NextRequest) {
  // 1. Authenticate the request
  const authHeader = req.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch all active circles with their reminder configuration
  const circles = await db.careCircle.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      reminderDaysBefore: true,
    },
  });

  const summary = {
    circlesProcessed: circles.length,
    shiftsEvaluated: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [] as Array<{
      circleId: string;
      circleName: string;
      shiftId: string;
      daysBefore: number;
      result: string;
    }>,
  };

  // 3. For each circle, check each reminder window
  for (const circle of circles) {
    const windows = (circle.reminderDaysBefore ?? [7, 2, 1]).filter(
      (n): n is DaysBefore => n === 7 || n === 2 || n === 1,
    );

    for (const daysBefore of windows) {
      // Compute the target date range: exactly N days from today, 00:00 → 23:59
      const targetStart = new Date();
      targetStart.setHours(0, 0, 0, 0);
      targetStart.setDate(targetStart.getDate() + daysBefore);

      const targetEnd = new Date(targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      // Find shifts in this circle happening exactly N days from now
      const shifts = await db.shift.findMany({
        where: {
          circleId: circle.id,
          scheduledDate: { gte: targetStart, lte: targetEnd },
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
          assignedUserId: { not: null },
        },
        select: { id: true },
      });

      summary.shiftsEvaluated += shifts.length;

      // Send a reminder for each matching shift
      for (const shift of shifts) {
        const result = await sendShiftReminder({
          shiftId: shift.id,
          daysBefore,
        });

        if (result.status === "sent") summary.sent++;
        else if (result.status === "skipped") summary.skipped++;
        else summary.failed++;

        summary.details.push({
          circleId: circle.id,
          circleName: circle.name,
          shiftId: shift.id,
          daysBefore,
          result:
            result.status === "sent"
              ? "sent"
              : result.status === "skipped"
                ? `skipped: ${result.reason}`
                : `failed: ${result.error}`,
        });
      }
    }
  }

  console.log("[cron/send-reminders] Summary:", {
    circlesProcessed: summary.circlesProcessed,
    shiftsEvaluated: summary.shiftsEvaluated,
    sent: summary.sent,
    skipped: summary.skipped,
    failed: summary.failed,
  });

  return NextResponse.json(summary);
}
