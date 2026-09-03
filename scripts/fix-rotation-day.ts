// scripts/fix-rotation-day.ts
//
// One-off cleanup: deletes all future SCHEDULED/SWAPPED shifts for every
// circle and regenerates them on the circle's *current* rotation day.
// Past history (COMPLETED / MISSED / IN_PROGRESS / CANCELLED, and anything
// already in the past) is untouched.
//
// Run with:  npx tsx scripts/fix-rotation-day.ts
//
// NOTE: requires the updated src/lib/shifts/generateShifts.ts (the version
// with the rotation-continuity fallback) so the regenerated shifts continue
// the rotation from whoever went last instead of restarting at the top.

import { db } from "@/lib/db";
import { ensureShiftsForCircle } from "@/lib/shifts/generateShifts";

async function main() {
  const circles = await db.careCircle.findMany({
    select: { id: true, name: true, rotationDayOfWeek: true },
  });

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (const circle of circles) {
    const deleted = await db.shift.deleteMany({
      where: {
        circleId: circle.id,
        scheduledDate: { gte: new Date() },
        status: { in: ["SCHEDULED", "SWAPPED"] },
      },
    });

    const created = await ensureShiftsForCircle(circle.id);

    console.log(
      `${circle.name}: deleted ${deleted.count} stale future shifts, ` +
        `regenerated ${created} on ${dayNames[circle.rotationDayOfWeek]}s`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
