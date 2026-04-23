// scripts/rebalance-shifts.ts
import { db } from "@/lib/db";

async function main() {
  const circles = await db.careCircle.findMany({
    select: { id: true, name: true },
  });

  for (const circle of circles) {
    // Get helpers in rotation, in rotation order
    const memberships = await db.circleMembership.findMany({
      where: {
        circleId: circle.id,
        active: true,
        inRotation: true,
        rotationOrder: { gte: 0 },
        role: { in: ["ADMIN", "HELPER"] },
      },
      orderBy: { rotationOrder: "asc" },
      select: { userId: true, rotationOrder: true },
    });

    if (memberships.length === 0) {
      console.log(`${circle.name}: no helpers in rotation, skipping`);
      continue;
    }

    console.log(
      `${circle.name}: ${memberships.length} helpers (order: ${memberships.map((m) => m.rotationOrder).join(", ")})`,
    );

    // Get all future SCHEDULED shifts in date order
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shifts = await db.shift.findMany({
      where: {
        circleId: circle.id,
        scheduledDate: { gte: today },
        status: "SCHEDULED",
      },
      orderBy: { scheduledDate: "asc" },
      select: { id: true, assignedUserId: true, scheduledDate: true },
    });

    // Reassign them round-robin
    let updated = 0;
    for (let i = 0; i < shifts.length; i++) {
      const correctUserId = memberships[i % memberships.length].userId;
      if (shifts[i].assignedUserId !== correctUserId) {
        await db.shift.update({
          where: { id: shifts[i].id },
          data: {
            assignedUserId: correctUserId,
            originalAssignedUserId: correctUserId,
          },
        });
        updated++;
      }
    }

    console.log(`  → rebalanced ${updated} of ${shifts.length} shifts`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
