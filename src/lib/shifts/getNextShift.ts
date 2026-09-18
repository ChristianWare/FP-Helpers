// lib/shifts/getNextShift.ts
import { db } from "@/lib/db";
import { shiftDayCutoff } from "@/lib/shifts/scheduleDates";

/**
 * Returns the next upcoming shift for a circle (today or later, not completed).
 * Returns null if no shifts are scheduled.
 */
export async function getNextShiftForCircle(circleId: string) {
  return db.shift.findFirst({
    where: {
      circleId,
      scheduledDate: { gt: shiftDayCutoff() },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    orderBy: { scheduledDate: "asc" },
    select: { id: true, scheduledDate: true },
  });
}
