// actions/shifts/sendTestReminder.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { sendShiftReminder } from "@/lib/notifications/sendShiftReminder";
import { revalidatePath } from "next/cache";

export async function sendTestReminder({
  shiftId,
  daysBefore,
}: {
  shiftId: string;
  daysBefore: 7 | 2 | 1;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in" };
  }

  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    select: {
      circleId: true,
      assignedUserId: true,
    },
  });

  if (!shift) {
    return { success: false, error: "Shift not found" };
  }

  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: {
        userId: session.user.id,
        circleId: shift.circleId,
      },
    },
  });

  const isAssignedHelper = shift.assignedUserId === session.user.id;
  const isAdmin = membership?.role === "ADMIN";

  if (!isAssignedHelper && !isAdmin && !session.user.isSuperAdmin) {
    return {
      success: false,
      error: "Only the assigned helper or an admin can send a test reminder",
    };
  }

  const result = await sendShiftReminder({
    shiftId,
    daysBefore,
    force: true,
  });

  revalidatePath(`/circles/${shift.circleId}/shifts/${shiftId}`);

  if (result.status === "sent") {
    return { success: true, message: "Reminder sent" };
  }

  if (result.status === "skipped") {
    return { success: false, error: `Skipped: ${result.reason}` };
  }

  return { success: false, error: result.error };
}
