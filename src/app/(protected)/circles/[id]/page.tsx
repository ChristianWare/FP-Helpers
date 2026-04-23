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

  // Find the next upcoming shift for each helper
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingShifts = await db.shift.findMany({
    where: {
      circleId: circle.id,
      scheduledDate: { gte: today },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      assignedUserId: { not: null },
    },
    orderBy: { scheduledDate: "asc" },
    select: {
      assignedUserId: true,
      scheduledDate: true,
    },
  });

  // Build a map of userId → earliest upcoming shift date
  const nextShiftByHelper: Record<string, string> = {};
  for (const shift of upcomingShifts) {
    if (shift.assignedUserId && !nextShiftByHelper[shift.assignedUserId]) {
      nextShiftByHelper[shift.assignedUserId] =
        shift.scheduledDate.toISOString();
    }
  }

  // Fetch the current user's upcoming + recent shifts for this circle
  const myUpcomingShifts = await db.shift.findMany({
    where: {
      circleId: circleId,
      assignedUserId: session.user.id,
      scheduledDate: { gte: today },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    orderBy: { scheduledDate: "asc" },
    take: 5,
  });

  const myRecentShifts = await db.shift.findMany({
    where: {
      circleId: circleId,
      assignedUserId: session.user.id,
      status: "COMPLETED",
    },
    orderBy: { scheduledDate: "desc" },
    take: 3,
  });

  // Fetch the full upcoming rotation (all helpers, next ~8 shifts)
  const rotationShifts = await db.shift.findMany({
    where: {
      circleId: circleId,
      scheduledDate: { gte: today },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    include: {
      assignedUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { scheduledDate: "asc" },
    take: 8,
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
      myUpcomingShifts={myUpcomingShifts.map((s) => ({
        id: s.id,
        scheduledDate: s.scheduledDate.toISOString(),
        status: s.status,
      }))}
      myRecentShifts={myRecentShifts.map((s) => ({
        id: s.id,
        scheduledDate: s.scheduledDate.toISOString(),
        status: s.status,
        completedAt: s.completedAt?.toISOString() ?? null,
      }))}
      rotationShifts={rotationShifts.map((s) => ({
        id: s.id,
        scheduledDate: s.scheduledDate.toISOString(),
        assignedUser: s.assignedUser
          ? {
              id: s.assignedUser.id,
              firstName: s.assignedUser.firstName,
              lastName: s.assignedUser.lastName,
            }
          : null,
      }))}
    />
  );
}
