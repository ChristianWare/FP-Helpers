// scripts/test-swap-emails.ts
import { db } from "@/lib/db";
import { sendSwapRequestEmails } from "@/lib/notifications/sendSwapRequestEmails";

async function main() {
  // Create a throwaway swap request for testing
  const shift = await db.shift.findFirst({
    where: { assignedUserId: { not: null }, status: "SCHEDULED" },
    orderBy: { scheduledDate: "asc" },
  });

  if (!shift) {
    console.error("No scheduled shift found");
    return;
  }

  const swap = await db.swapRequest.create({
    data: {
      shiftId: shift.id,
      requestedById: shift.assignedUserId!,
      reason: "Out of town for a wedding",
      status: "OPEN",
    },
  });

  const result = await sendSwapRequestEmails({ swapRequestId: swap.id });
  console.log(result);

  // Clean up
  await db.swapRequest.delete({ where: { id: swap.id } });
}

main();
