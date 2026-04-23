// lib/shifts/getShiftDetails.ts
import { db } from "@/lib/db";

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
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      },
      notifications: {
        where: {
          OR: [
            { template: { startsWith: "shift_reminder_" } },
            { template: { startsWith: "swap_request_" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          template: true,
          channel: true,
          status: true,
          sentAt: true,
          createdAt: true,
          error: true,
        },
      },
      swapRequests: {
        where: { status: "OPEN" },
        include: {
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1, // There should only ever be one open swap at a time
      },
    },
  });
}
