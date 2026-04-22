// scripts/generate-existing-shifts.ts
import { db } from "@/lib/db";
import { ensureShiftsForCircle } from "@/lib/shifts/generateShifts";

async function main() {
  const circles = await db.careCircle.findMany({
    select: { id: true, name: true },
  });

  for (const circle of circles) {
    const count = await ensureShiftsForCircle(circle.id);
    console.log(`${circle.name}: generated ${count} shifts`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
