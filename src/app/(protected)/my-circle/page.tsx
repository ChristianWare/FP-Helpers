// app/(protected)/my-circle/page.tsx
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import MyCirclePage from "./MyCirclePage";
import MyMealTrainPage from "./MyMealTrainPage";
import {
  describeSchedule,
  getCircleDays,
  shiftDayCutoff,
  visitsPerWeek,
} from "@/lib/shifts/scheduleDates";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ circle?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { circle: requestedCircleId } = await searchParams;

  // A person can be the recipient of more than one circle over time (a meal
  // train now, a rotation later). ?circle= picks one; otherwise prefer the
  // one that's still running, newest first.
  const membership = await db.circleMembership.findFirst({
    where: {
      userId: session.user.id,
      role: "RECIPIENT",
      active: true,
      ...(requestedCircleId ? { circleId: requestedCircleId } : {}),
    },
    orderBy: [{ circle: { status: "asc" } }, { joinedAt: "desc" }],
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
    redirect("/dashboard");
  }

  const circle = membership.circle;
  const isMealTrain = circle.circleType === "MEAL_TRAIN";

  // Do they also help in other circles? Then they need a way back.
  const hasDashboard =
    (await db.circleMembership.count({
      where: {
        userId: session.user.id,
        active: true,
        role: { not: "RECIPIENT" },
      },
    })) > 0;

  const upcomingShifts = await db.shift.findMany({
    where: {
      circleId: circle.id,
      scheduledDate: { gt: shiftDayCutoff() },
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
    // A rotation shows one turn of the roster; a meal train shows the calendar
    take: isMealTrain ? 120 : Math.max(circle.memberships.length, 1),
  });

  const helpers = circle.memberships.map((m) => ({
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    phone: m.user.phone,
  }));

  // ——— Meal train: who's coming, when, and with what ———
  if (isMealTrain) {
    // Only show people who've actually signed up for something upcoming
    // or are organizing — a big church group may have dozens of members.
    const bringing = new Set(
      upcomingShifts.map((s) => s.assignedUser?.id).filter(Boolean),
    );
    const activeHelpers = circle.memberships
      .filter((m) => m.role === "ADMIN" || bringing.has(m.user.id))
      .map((m) => ({
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        phone: m.user.phone,
        isOrganizer: m.role === "ADMIN",
      }));

    return (
      <MyMealTrainPage
        circleId={circle.id}
        circleName={circle.name}
        userName={session.user.firstName ?? "there"}
        userEmail={session.user.email ?? ""}
        hasDashboard={hasDashboard}
        isFinished={circle.status === "ARCHIVED"}
        scheduleLabel={describeSchedule(
          getCircleDays(circle),
          circle.rotationCadence,
        )}
        dropoffTime={circle.typicalArrivalTime}
        details={{
          mealHouseholdSize: circle.mealHouseholdSize,
          mealAllergies: circle.mealAllergies,
          mealPreferences: circle.mealPreferences,
        }}
        days={upcomingShifts.map((s) => ({
          id: s.id,
          scheduledDate: s.scheduledDate.toISOString(),
          mealDescription: s.mealDescription,
          mealNotes: s.mealNotes,
          helper: s.assignedUser
            ? {
                firstName: s.assignedUser.firstName,
                lastName: s.assignedUser.lastName,
                phone: s.assignedUser.phone,
              }
            : null,
        }))}
        helpers={activeHelpers}
      />
    );
  }

  const nextShiftId = upcomingShifts[0]?.id ?? null;

  // Split grocery items: "this week" = assigned to the next shift
  //                     "saved for later" = everything else (null or future shifts)
  const allGroceryItems = circle.groceryItems.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    notes: item.notes,
    status: item.status,
    assignedShiftId: item.assignedShiftId,
    addedBy: item.addedBy
      ? `${item.addedBy.firstName} ${item.addedBy.lastName}`
      : null,
  }));

  const thisWeekItems = nextShiftId
    ? allGroceryItems.filter((item) => item.assignedShiftId === nextShiftId)
    : [];
  const savedForLaterItems = nextShiftId
    ? allGroceryItems.filter((item) => item.assignedShiftId !== nextShiftId)
    : allGroceryItems;

  const prescriptions = circle.prescriptions.map((rx) => ({
    id: rx.id,
    medicationName: rx.medicationName,
    needsPickupThisWeek: false,
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
      scheduleLabel={describeSchedule(
        getCircleDays(circle),
        circle.rotationCadence,
      )}
      multipleVisitsPerWeek={
        visitsPerWeek(getCircleDays(circle), circle.rotationCadence) > 1
      }
      hasDashboard={hasDashboard}
      typicalArrivalTime={circle.typicalArrivalTime}
      upcomingShifts={shifts}
      thisWeekItems={thisWeekItems}
      savedForLaterItems={savedForLaterItems}
      prescriptions={prescriptions}
      helpers={helpers}
    />
  );
}
