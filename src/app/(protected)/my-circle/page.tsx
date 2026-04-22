// app/(protected)/my-circle/page.tsx
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import MyCirclePage from "./MyCirclePage";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Find the circle where this user is the recipient
  const membership = await db.circleMembership.findFirst({
    where: {
      userId: session.user.id,
      role: "RECIPIENT",
      active: true,
    },
    include: {
      circle: {
        include: {
          memberships: {
            where: {
              active: true,
              role: { in: ["ADMIN", "HELPER"] },
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
            orderBy: { rotationOrder: "asc" },
          },
          groceryItems: {
            where: { status: { not: "REMOVED" } },
            include: {
              addedBy: {
                select: { firstName: true, lastName: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          prescriptions: {
            where: { active: true },
            include: {
              defaultPharmacy: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!membership) {
    // User isn't a recipient — bounce to dashboard
    redirect("/dashboard");
  }

  const circle = membership.circle;

  // Fetch the next 4 upcoming shifts (today or later, not yet completed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingShifts = await db.shift.findMany({
    where: {
      circleId: circle.id,
      scheduledDate: { gte: today },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
    orderBy: { scheduledDate: "asc" },
    take: 4,
  });

  const helpers = circle.memberships.map((m) => ({
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    phone: m.user.phone,
  }));

  const groceryItems = circle.groceryItems.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    notes: item.notes,
    status: item.status,
    addedBy: item.addedBy
      ? `${item.addedBy.firstName} ${item.addedBy.lastName}`
      : null,
  }));

  const prescriptions = circle.prescriptions.map((rx) => ({
    id: rx.id,
    medicationName: rx.medicationName,
    needsPickupThisWeek: false, // field exists but unused in current UI
    pharmacyName: rx.defaultPharmacy?.name ?? null,
    pharmacyPhone: rx.defaultPharmacy?.phone ?? null,
    notes: rx.notes,
  }));

  const shifts = upcomingShifts.map((s) => ({
    id: s.id,
    scheduledDate: s.scheduledDate.toISOString(),
    helper: s.assignedUser
      ? {
          firstName: s.assignedUser.firstName,
          lastName: s.assignedUser.lastName,
          phone: s.assignedUser.phone,
        }
      : null,
  }));

  return (
    <MyCirclePage
      circleId={circle.id}
      circleName={circle.name}
      userName={session.user.firstName ?? "there"}
      userEmail={session.user.email ?? ""}
      rotationDayOfWeek={circle.rotationDayOfWeek}
      rotationCadence={circle.rotationCadence}
      typicalArrivalTime={circle.typicalArrivalTime}
      upcomingShifts={shifts}
      groceryItems={groceryItems}
      prescriptions={prescriptions}
      helpers={helpers}
    />
  );
}
