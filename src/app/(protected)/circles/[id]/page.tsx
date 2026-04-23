// app/(protected)/circles/[id]/page.tsx
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import CirclePage from "./CirclePage";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: circleId } = await params;
  const { created } = await searchParams;
  const justCreated = created === "1";

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
  if (!membership && !session.user.isSuperAdmin) {
    redirect("/dashboard");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = circle.joinLinks[0]
    ? `${baseUrl}/join/${circle.joinLinks[0].token}`
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // How many helpers are in rotation — defines "one rotation's worth" of slots
  const helpersInRotationCount = await db.circleMembership.count({
    where: {
      circleId: circle.id,
      active: true,
      inRotation: true,
      role: { in: ["ADMIN", "HELPER"] },
    },
  });

  const slotCount = Math.max(helpersInRotationCount, 1);

  // "The rotation" view shows:
  //   - The N most recent completed shifts (1 rotation's worth of recent history)
  //   - The next N upcoming shifts (1 rotation's worth of what's coming)
  //
  // When a shift completes, it joins "recent completed" and pushes the
  // oldest completed off the list. This keeps the view anchored to
  // "what just happened + what's next."

  const upcomingInRotation = await db.shift.findMany({
    where: {
      circleId: circle.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      scheduledDate: { gte: today },
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

  // Combine: completed (oldest first, chronological) + upcoming (chronological)
  const rotationShifts = [
    ...[...recentCompleted].reverse(),
    ...upcomingInRotation,
  ];

  // Build map of userId → earliest upcoming shift date (for helper cards)
  const nextShiftByHelper: Record<string, string> = {};
  for (const shift of upcomingInRotation) {
    if (shift.assignedUserId && !nextShiftByHelper[shift.assignedUserId]) {
      nextShiftByHelper[shift.assignedUserId] =
        shift.scheduledDate.toISOString();
    }
  }

  // The current user's next upcoming shift in THIS circle — regardless
  // of whether it falls inside the rotation window we're displaying above.
  // If Christian's shifts in the current rotation are all completed or
  // swapped away, this still finds his next one further out.
  const myNextShift = await db.shift.findFirst({
    where: {
      circleId: circle.id,
      assignedUserId: session.user.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      scheduledDate: { gte: today },
    },
    orderBy: { scheduledDate: "asc" },
    select: {
      id: true,
      scheduledDate: true,
    },
  });

  return (
    <CirclePage
      circle={{
        id: circle.id,
        name: circle.name,
        status: circle.status,
        address: circle.address,
        rotationDayOfWeek: circle.rotationDayOfWeek,
        rotationCadence: circle.rotationCadence,
        typicalArrivalTime: circle.typicalArrivalTime,
        durationType: circle.durationType,
        startDate: circle.startDate?.toISOString() ?? null,
        endDate: circle.endDate?.toISOString() ?? null,
      }}
      recipient={circle.recipient}
      memberships={circle.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        inRotation: m.inRotation,
        user: m.user,
      }))}
      currentUserId={session.user.id!}
      currentUserRole={membership?.role ?? null}
      joinUrl={joinUrl}
      justCreated={justCreated}
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
