// lib/shifts/getShiftDetails.ts
import { db } from "@/lib/db";

/**
 * Loads everything the helper needs to see for a specific shift:
 * circle info (recipient, address, notes), the grocery list for this shift,
 * the recipient's active prescriptions (for reference), and the assigned helper.
 */
export async function getShiftDetails(shiftId: string) {
  return db.shift.findUnique({
    where: { id: shiftId },
    include: {
      assignedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      circle: {
        select: {
          id: true,
          name: true,
          address: true,
          accessNotes: true,
          typicalArrivalTime: true,
          emergencyContact: true,
          emergencyPhone: true,
          recipient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          prescriptions: {
            where: { active: true },
            include: {
              defaultPharmacy: {
                select: { name: true, phone: true, address: true },
              },
            },
          },
        },
      },
      groceryItems: {
        where: { status: { not: "REMOVED" } },
        include: {
          addedBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [
          { status: "asc" }, // PENDING before PURCHASED
          { createdAt: "asc" },
        ],
      },
    },
  });
}
