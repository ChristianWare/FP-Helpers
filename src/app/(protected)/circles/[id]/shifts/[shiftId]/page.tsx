// app/(protected)/circles/[id]/shifts/[shiftId]/page.tsx
import { auth } from "../../../../../../../auth";
import { redirect, notFound } from "next/navigation";
import { getShiftDetails } from "@/lib/shifts/getShiftDetails";
import { db } from "@/lib/db";
import ShiftDetailPage from "./ShiftDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; shiftId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: circleId, shiftId } = await params;

  // Verify membership
  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: { userId: session.user.id, circleId },
    },
  });

  if (!membership && !session.user.isSuperAdmin) {
    redirect("/dashboard");
  }

  const shift = await getShiftDetails(shiftId);

  if (!shift || shift.circleId !== circleId) {
    notFound();
  }

  const isAssignedHelper = shift.assignedUserId === session.user.id;

  return (
    <ShiftDetailPage
      currentUserName={session.user.firstName ?? "there"}
      currentUserEmail={session.user.email ?? ""}
      isAssignedHelper={isAssignedHelper}
      shift={{
        id: shift.id,
        scheduledDate: shift.scheduledDate.toISOString(),
        status: shift.status,
        completedAt: shift.completedAt?.toISOString() ?? null,
        assignedUser: shift.assignedUser,
      }}
      circle={{
        id: shift.circle.id,
        name: shift.circle.name,
        address: shift.circle.address,
        accessNotes: shift.circle.accessNotes,
        typicalArrivalTime: shift.circle.typicalArrivalTime,
        emergencyContact: shift.circle.emergencyContact,
        emergencyPhone: shift.circle.emergencyPhone,
      }}
      recipient={shift.circle.recipient}
      groceryItems={shift.groceryItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes,
        status: item.status,
        addedBy: item.addedBy
          ? `${item.addedBy.firstName} ${item.addedBy.lastName}`
          : null,
      }))}
      prescriptions={shift.circle.prescriptions.map((rx) => ({
        id: rx.id,
        medicationName: rx.medicationName,
        pharmacyName: rx.defaultPharmacy?.name ?? null,
        pharmacyPhone: rx.defaultPharmacy?.phone ?? null,
        pharmacyAddress: rx.defaultPharmacy?.address ?? null,
        notes: rx.notes,
      }))}
    />
  );
}
