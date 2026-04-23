// scripts/test-reminder.ts
import { sendShiftReminder } from "@/lib/notifications/sendShiftReminder";

async function main() {
  const result = await sendShiftReminder({
    shiftId: "cmoafhg300001km2mdn3rzkb5", // one of Mike's shift IDs from Prisma Studio
    daysBefore: 2,
    force: true,
  });
  console.log(result);
}

main();
