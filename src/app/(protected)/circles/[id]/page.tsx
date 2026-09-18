// app/(protected)/circles/[id]/page.tsx
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import CirclePage from "./CirclePage";
import { getCircleDays, shiftDayCutoff } from "@/lib/shifts/scheduleDates";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    existing?: string;
    joined?: string;
    taken?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: circleId } = await params;
  const { created, existing, joined, taken } = await searchParams;
  const justCreated = created === "1";
  const recipientHadAccount = existing === "1";
  const justJoined = joined === "1";
  const takenCount = Math.max(0, Math.min(99, Number(taken) || 0));

  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    include: {
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      memberships: {
        where: { active: true },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      joinLinks: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!circle) notFound();

  const membership = circle.memberships.find(
    (m) => m.userId === session.user.id,
  );

  // Non-members may PREVIEW a circle — but only if the organizer listed it in
  // the congregation directory, and only a stripped-down version: names,
  // schedule and rotation, never addresses, phone numbers, emails or notes.
  // Unlisted circles keep their promise: invite link only.
  const isMember = !!membership || !!session.user.isSuperAdmin;
  const canPreview = circle.listedInDirectory && circle.status === "ACTIVE";
  if (!isMember && !canPreview) {
    redirect("/dashboard");
  }
  const previewOnly = !isMember;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinToken = circle.joinLinks[0]?.token ?? null;
  const joinUrl = joinToken ? `${baseUrl}/join/${joinToken}` : null;

  // "Today or later" for shifts — see lib/shifts/scheduleDates.ts for why this
  // isn't simply midnight UTC.
  const cutoff = shiftDayCutoff();
  const isMealTrain = circle.circleType === "MEAL_TRAIN";

  const helpersInRotationCount = await db.circleMembership.count({
    where: {
      circleId: circle.id,
      active: true,
      inRotation: true,
      role: { in: ["ADMIN", "HELPER"] },
    },
  });

  const slotCount = Math.max(helpersInRotationCount, 1);

  const upcomingInRotation = await db.shift.findMany({
    where: {
      circleId: circle.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      scheduledDate: { gt: cutoff },
    },
    include: {
      assignedUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { scheduledDate: "asc" },
    take: slotCount,
  });

  const recentCompleted = await db.shift.findMany({
    where: {
      circleId: circle.id,
      status: "COMPLETED",
    },
    include: {
      assignedUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { scheduledDate: "desc" },
    take: slotCount,
  });

  const rotationShifts = [
    ...[...recentCompleted].reverse(),
    ...upcomingInRotation,
  ];

  const nextShiftByHelper: Record<string, string> = {};
  for (const shift of upcomingInRotation) {
    if (shift.assignedUserId && !nextShiftByHelper[shift.assignedUserId]) {
      nextShiftByHelper[shift.assignedUserId] =
        shift.scheduledDate.toISOString();
    }
  }

  const myNextShift = await db.shift.findFirst({
    where: {
      circleId: circle.id,
      assignedUserId: session.user.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      scheduledDate: { gt: cutoff },
    },
    orderBy: { scheduledDate: "asc" },
    select: {
      id: true,
      scheduledDate: true,
    },
  });

  // Meal train: the whole calendar — open days, claimed days, and anything
  // delivered today — rather than one turn of a rotation.
  const mealSlots = isMealTrain
    ? await db.shift.findMany({
        where: {
          circleId: circle.id,
          status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
          scheduledDate: { gt: cutoff },
        },
        include: {
          assignedUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { scheduledDate: "asc" },
        take: 200,
      })
    : [];

  return (
    <CirclePage
      circle={{
        id: circle.id,
        name: circle.name,
        status: circle.status,
        address: previewOnly ? null : circle.address,
        addressCity: previewOnly ? null : circle.addressCity,
        addressState: previewOnly ? null : circle.addressState,
        addressZip: previewOnly ? null : circle.addressZip,
        accessNotes: previewOnly ? null : circle.accessNotes,
        circleType: circle.circleType,
        listedInDirectory: circle.listedInDirectory,
        rotationDaysOfWeek: getCircleDays(circle),
        rotationCadence: circle.rotationCadence,
        typicalArrivalTime: circle.typicalArrivalTime,
        durationType: circle.durationType,
        startDate: circle.startDate?.toISOString() ?? null,
        endDate: circle.endDate?.toISOString() ?? null,
        mealHouseholdSize: previewOnly ? null : circle.mealHouseholdSize,
        mealAllergies: previewOnly ? null : circle.mealAllergies,
        mealPreferences: previewOnly ? null : circle.mealPreferences,
      }}
      recipient={
        circle.recipient
          ? {
              id: circle.recipient.id,
              firstName: circle.recipient.firstName,
              lastName: circle.recipient.lastName,
              // Contact details never leave the server for a preview
              email: previewOnly ? null : circle.recipient.email,
              phone: previewOnly ? null : circle.recipient.phone,
            }
          : null
      }
      memberships={circle.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        inRotation: m.inRotation,
        user: {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: previewOnly ? null : m.user.email,
          phone: previewOnly ? null : m.user.phone,
        },
      }))}
      currentUserId={session.user.id!}
      currentUserRole={membership?.role ?? null}
      isMember={isMember}
      joinToken={joinToken}
      joinUrl={previewOnly ? null : joinUrl}
      justCreated={justCreated}
      recipientHadAccount={recipientHadAccount}
      justJoined={justJoined}
      takenCount={takenCount}
      mealSlots={mealSlots.map((slot) => ({
        id: slot.id,
        scheduledDate: slot.scheduledDate.toISOString(),
        status: slot.status,
        mealDescription: slot.mealDescription,
        mealNotes: slot.mealNotes,
        assignedUser: slot.assignedUser,
      }))}
      nextShiftByHelper={nextShiftByHelper}
      rotationShifts={rotationShifts.map((s) => ({
        id: s.id,
        scheduledDate: s.scheduledDate.toISOString(),
        status: s.status,
        completedAt: s.completedAt?.toISOString() ?? null,
        assignedUser: s.assignedUser
          ? {
              id: s.assignedUser.id,
              firstName: s.assignedUser.firstName,
              lastName: s.assignedUser.lastName,
            }
          : null,
      }))}
      myNextShift={
        myNextShift
          ? {
              id: myNextShift.id,
              scheduledDate: myNextShift.scheduledDate.toISOString(),
            }
          : null
      }
    />
  );
}
