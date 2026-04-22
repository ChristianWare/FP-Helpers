// scripts/backfill-grocery-items.ts
import { db } from "@/lib/db";
import { getNextShiftForCircle } from "@/lib/shifts/getNextShift";

async function main() {
  const circles = await db.careCircle.findMany({
    select: { id: true, name: true },
  });

  for (const circle of circles) {
    const nextShift = await getNextShiftForCircle(circle.id);
    if (!nextShift) {
      console.log(`${circle.name}: no upcoming shift, skipping`);
      continue;
    }

    const updated = await db.groceryItem.updateMany({
      where: {
        circleId: circle.id,
        assignedShiftId: null,
        status: { not: "REMOVED" },
      },
      data: {
        assignedShiftId: nextShift.id,
      },
    });

    console.log(
      `${circle.name}: assigned ${updated.count} items to next shift`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
