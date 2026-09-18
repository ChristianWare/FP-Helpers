// scripts/repair-rotation.ts
//
//   npx tsx scripts/repair-rotation.ts           ← dry run, writes nothing
//   npx tsx scripts/repair-rotation.ts --apply   ← make the changes
import { db } from "@/lib/db";
import {
  applyRotationOrder,
  dealRotation,
  getRotationRoster,
  getUpcomingSlots,
  inferRotationOrder,
} from "@/lib/shifts/rotationOrder";

const APPLY = process.argv.includes("--apply");

function fmt(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function main() {
  console.log(
    APPLY ? "APPLYING changes\n" : "DRY RUN — nothing will be written\n",
  );

  const circles = await db.careCircle.findMany({
    where: { status: "ACTIVE", circleType: "STANDARD" },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  for (const circle of circles) {
    const roster = await getRotationRoster(circle.id);
    const slots = await getUpcomingSlots(circle.id);
    const nameOf = new Map(
      roster.map((m) => [m.userId, `${m.user.firstName} ${m.user.lastName}`]),
    );
    const label = (userId: string | null) =>
      userId ? (nameOf.get(userId) ?? "(not in rotation)") : "(nobody)";

    console.log(`━━━ ${circle.name}`);
    if (roster.length === 0 || slots.length === 0) {
      console.log("    Nothing to do.\n");
      continue;
    }

    const order = inferRotationOrder(
      roster.map((m) => m.userId),
      slots,
    );
    const handovers = dealRotation(order, slots).filter(
      (c) => slots.find((s) => s.id === c.shiftId)?.assignedUserId !== c.userId,
    );

    console.log("    Rotation order, starting with who's up next:");
    order.forEach((userId, i) =>
      console.log(`      ${i + 1}. ${label(userId)}`),
    );

    if (handovers.length === 0) {
      console.log("    ✓ Already consistent.\n");
    } else {
      console.log(`\n    ${handovers.length} shift(s) would change hands:`);
      for (const change of handovers) {
        const slot = slots.find((s) => s.id === change.shiftId)!;
        console.log(
          `      ${fmt(slot.scheduledDate)}   ${label(slot.assignedUserId)}  →  ${label(change.userId)}`,
        );
      }
      console.log("");
    }

    if (APPLY) await applyRotationOrder(circle.id, order);
  }

  if (!APPLY) console.log("If that looks right, re-run with --apply.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
