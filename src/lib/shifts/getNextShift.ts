// lib/shifts/getNextShift.ts
import { db } from "@/lib/db";

/**
 * Returns the next upcoming shift for a circle (today or later, not completed).
 * Returns null if no shifts are scheduled.
 */
export async function getNextShiftForCircle(circleId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db.shift.findFirst({
    where: {
      circleId,
      scheduledDate: { gte: today },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    orderBy: { scheduledDate: "asc" },
    select: { id: true, scheduledDate: true },
  });
}
