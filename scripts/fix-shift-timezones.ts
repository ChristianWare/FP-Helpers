// scripts/fix-shift-timezones.ts
import { db } from "@/lib/db";

async function main() {
  const shifts = await db.shift.findMany({
    where: {
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    select: { id: true, scheduledDate: true },
  });

  console.log(`Found ${shifts.length} future shifts to check`);

  let updated = 0;
  for (const shift of shifts) {
    // Only fix shifts that are exactly at 00:00 UTC
    const d = shift.scheduledDate;
    if (
      d.getUTCHours() === 0 &&
      d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0
    ) {
      const fixed = new Date(d);
      fixed.setUTCHours(12, 0, 0, 0);

      await db.shift.update({
        where: { id: shift.id },
        data: { scheduledDate: fixed },
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} shifts`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
