// scripts/backfill-rotation-days.ts
//
// One-time backfill after adding CareCircle.rotationDaysOfWeek / circleType.
//
//   npx tsx scripts/backfill-rotation-days.ts            ← dry run, changes nothing
//   npx tsx scripts/backfill-rotation-days.ts --apply    ← write the changes
//   npx tsx scripts/backfill-rotation-days.ts --apply --clean-biweekly
//
// What it does:
//   1. Copies each circle's single rotationDayOfWeek into the new
//      rotationDaysOfWeek array (Saturday → [6]).
//   2. Gives every BIWEEKLY circle a fixed scheduleAnchorDate, taken from its
//      next upcoming shift so its current on/off weeks are preserved.
//   3. Reports BIWEEKLY circles that the old generator let drift to weekly
//      (shifts sitting in "off" weeks). With --clean-biweekly it removes those
//      extra future shifts — only untouched SCHEDULED ones.
//
// The app is safe to deploy BEFORE this runs: an empty rotationDaysOfWeek
// falls back to rotationDayOfWeek everywhere (see getCircleDays). Running it
// just makes the data match the new model.
import { db } from "@/lib/db";
import {
  computeScheduleKeys,
  currentShiftDayKey,
  dateKeyToNoonUtc,
  firstOccurrenceKey,
  getCircleDays,
  shiftDayCutoff,
  toDateKey,
} from "@/lib/shifts/scheduleDates";

const APPLY = process.argv.includes("--apply");
const CLEAN_BIWEEKLY = process.argv.includes("--clean-biweekly");

async function main() {
  console.log(
    APPLY
      ? "APPLYING changes\n"
      : "DRY RUN — nothing will be written (add --apply)\n",
  );

  const circles = await db.careCircle.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      rotationCadence: true,
      rotationDaysOfWeek: true,
      rotationDayOfWeek: true,
      scheduleAnchorDate: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let daysBackfilled = 0;
  let anchorsSet = 0;
  let driftedCircles = 0;
  let driftShiftsRemoved = 0;

  for (const circle of circles) {
    const days = getCircleDays(circle);

    // ——— 1. Days array ———
    if (circle.rotationDaysOfWeek.length === 0) {
      console.log(
        `• ${circle.name}: rotationDaysOfWeek ← [${days.join(", ")}]`,
      );
      daysBackfilled++;
      if (APPLY) {
        await db.careCircle.update({
          where: { id: circle.id },
          data: { rotationDaysOfWeek: days },
        });
      }
    }

    if (circle.rotationCadence !== "BIWEEKLY") continue;

    // ——— 2. Biweekly anchor ———
    const upcoming = await db.shift.findMany({
      where: {
        circleId: circle.id,
        scheduledDate: { gt: shiftDayCutoff() },
        status: "SCHEDULED",
      },
      orderBy: { scheduledDate: "asc" },
      select: { id: true, scheduledDate: true },
    });

    const anchorKey = circle.scheduleAnchorDate
      ? toDateKey(circle.scheduleAnchorDate)
      : upcoming.length > 0
        ? toDateKey(upcoming[0].scheduledDate)
        : firstOccurrenceKey(days, currentShiftDayKey());

    if (!circle.scheduleAnchorDate) {
      console.log(`• ${circle.name}: biweekly anchor ← ${anchorKey}`);
      anchorsSet++;
      if (APPLY) {
        await db.careCircle.update({
          where: { id: circle.id },
          data: { scheduleAnchorDate: dateKeyToNoonUtc(anchorKey) },
        });
      }
    }

    // ——— 3. Drift check ———
    if (upcoming.length === 0) continue;
    const lastKey = toDateKey(upcoming[upcoming.length - 1].scheduledDate);
    const onWeeks = new Set(
      computeScheduleKeys({
        days,
        cadence: "BIWEEKLY",
        fromKey: toDateKey(upcoming[0].scheduledDate),
        untilKey: lastKey,
        anchorKey,
        maxCount: 1000,
      }),
    );
    const drifted = upcoming.filter(
      (s) => !onWeeks.has(toDateKey(s.scheduledDate)),
    );
    if (drifted.length === 0) continue;

    driftedCircles++;
    console.log(
      `! ${circle.name}: ${drifted.length} upcoming shift(s) fall in OFF weeks — this "every other week" circle had drifted to weekly:`,
    );
    console.log(
      `    ${drifted.map((s) => toDateKey(s.scheduledDate)).join(", ")}`,
    );

    if (CLEAN_BIWEEKLY) {
      driftShiftsRemoved += drifted.length;
      if (APPLY) {
        await db.shift.deleteMany({
          where: { id: { in: drifted.map((s) => s.id) }, status: "SCHEDULED" },
        });
      }
      console.log(
        `    ${APPLY ? "removed" : "would remove"} them (--clean-biweekly)`,
      );
    } else {
      console.log("    re-run with --clean-biweekly to remove them");
    }
  }

  console.log("\n——— Summary ———");
  console.log(`Circles checked:            ${circles.length}`);
  console.log(`Days arrays backfilled:     ${daysBackfilled}`);
  console.log(`Biweekly anchors set:       ${anchorsSet}`);
  console.log(`Biweekly circles drifted:   ${driftedCircles}`);
  if (CLEAN_BIWEEKLY)
    console.log(`Off-week shifts removed:    ${driftShiftsRemoved}`);
  if (!APPLY)
    console.log("\nDry run only. Re-run with --apply to write these changes.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
