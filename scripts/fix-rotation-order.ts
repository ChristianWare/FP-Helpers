// scripts/fix-rotation-order.ts
import { db } from "@/lib/db";

async function main() {
  const circles = await db.careCircle.findMany({
    include: {
      memberships: {
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  for (const circle of circles) {
    let order = 0;
    for (const m of circle.memberships) {
      if (m.role === "RECIPIENT") {
        await db.circleMembership.update({
          where: { id: m.id },
          data: { rotationOrder: -1, inRotation: false },
        });
      } else {
        await db.circleMembership.update({
          where: { id: m.id },
          data: { rotationOrder: order, inRotation: true },
        });
        order++;
      }
    }
    console.log(`Fixed ${circle.name}: ${order} helpers in rotation`);
  }
}

main().finally(() => db.$disconnect());
