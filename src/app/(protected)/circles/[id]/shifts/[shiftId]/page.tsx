// app/(protected)/circles/[id]/shifts/[shiftId]/page.tsx
import { auth } from "../../../../../../../auth";
import { redirect, notFound } from "next/navigation";
import { getShiftDetails } from "@/lib/shifts/getShiftDetails";
import { db } from "@/lib/db";
import ShiftDetailPage from "./ShiftDetailPage";
import MealShiftPage from "./MealShiftPage";
import { formatCircleAddress } from "@/lib/circles/formatAddress";
import {
  describeReminderDays,
  effectiveReminderDays,
} from "@/lib/shifts/reminderDays";

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

  const reminderDays = effectiveReminderDays(shift.circle);
  const notifications = shift.notifications.map((n) => ({
    id: n.id,
    template: n.template,
    channel: n.channel,
    status: n.status,
    sentAt: n.sentAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
    error: n.error,
  }));

  // ——— Meal train: a different page entirely ———
  // No grocery list, prescriptions or swaps — it's about the meal, who it's
  // for, and where it goes.
  if (shift.circle.circleType === "MEAL_TRAIN") {
    const { line1, line2 } = formatCircleAddress(shift.circle);
    const canSignUp =
      !!membership &&
      membership.active &&
      (membership.role === "HELPER" || membership.role === "ADMIN");

    return (
      <MealShiftPage
        currentUserName={session.user.firstName ?? "there"}
        currentUserEmail={session.user.email ?? ""}
        isAssignedHelper={isAssignedHelper}
        isAdmin={membership?.role === "ADMIN"}
        canSignUp={canSignUp}
        shift={{
          id: shift.id,
          scheduledDate: shift.scheduledDate.toISOString(),
          status: shift.status,
          completedAt: shift.completedAt?.toISOString() ?? null,
          mealDescription: shift.mealDescription,
          mealNotes: shift.mealNotes,
          assignedUser: shift.assignedUser,
        }}
        circle={{
          id: shift.circle.id,
          name: shift.circle.name,
          addressLine1: line1,
          addressLine2: line2,
          accessNotes: shift.circle.accessNotes,
          typicalArrivalTime: shift.circle.typicalArrivalTime,
          emergencyContact: shift.circle.emergencyContact,
          emergencyPhone: shift.circle.emergencyPhone,
          mealHouseholdSize: shift.circle.mealHouseholdSize,
          mealAllergies: shift.circle.mealAllergies,
          mealPreferences: shift.circle.mealPreferences,
        }}
        recipient={shift.circle.recipient}
        notifications={notifications}
        reminderSummary={describeReminderDays(reminderDays)}
        reminderDays={reminderDays}
      />
    );
  }

  // Determine if the current user is eligible to claim a swap on this shift
  //   - Must be an active, in-rotation helper or admin
  //   - Must NOT be the currently assigned helper
  //   - Must NOT be the one who requested the swap
  const isEligibleClaimer =
    !!membership &&
    membership.active &&
    membership.inRotation &&
    (membership.role === "HELPER" || membership.role === "ADMIN") &&
    !isAssignedHelper;

  // Count other in-rotation helpers — for swap modal messaging
  const otherHelperCount = await db.circleMembership.count({
    where: {
      circleId,
      active: true,
      inRotation: true,
      role: { in: ["ADMIN", "HELPER"] },
      userId: { not: session.user.id },
    },
  });

  const openSwapRequest = shift.swapRequests[0] ?? null;

  return (
    <ShiftDetailPage
      currentUserId={session.user.id!}
      currentUserName={session.user.firstName ?? "there"}
      currentUserEmail={session.user.email ?? ""}
      isAssignedHelper={isAssignedHelper}
      isEligibleClaimer={isEligibleClaimer}
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
      notifications={notifications}
      reminderSummary={describeReminderDays(reminderDays)}
      reminderDays={reminderDays}
      otherHelperCount={otherHelperCount}
      openSwapRequest={
        openSwapRequest
          ? {
              id: openSwapRequest.id,
              reason: openSwapRequest.reason,
              createdAt: openSwapRequest.createdAt.toISOString(),
              requestedBy: {
                id: openSwapRequest.requestedBy.id,
                firstName: openSwapRequest.requestedBy.firstName,
                lastName: openSwapRequest.requestedBy.lastName,
              },
            }
          : null
      }
    />
  );
}
