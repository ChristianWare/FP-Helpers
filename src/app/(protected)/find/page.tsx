// app/(protected)/find/page.tsx
//
// The congregation directory: every ACTIVE circle whose organizer listed it.
// The page itself is reachable signed-out (the middleware doesn't guard
// /find) — but the LIST is not: signed-out visitors get a sign-in prompt,
// because these cards name real people in the congregation who are going
// through something. Only safe fields ever leave the server: no addresses,
// no allergies, no contact info.
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import FindPage, { type DirectoryCircle } from "./FindPage";
import {
  describeSchedule,
  getCircleDays,
  shiftDayCutoff,
  toDateKey,
} from "@/lib/shifts/scheduleDates";

export const metadata = { title: "Find a circle — FP Helpers" };

export default async function Page() {
  const session = await auth();

  // ——— Signed out: the shell only ———
  if (!session?.user?.id) {
    return <FindPage viewerSignedIn={false} circles={[]} />;
  }

  const userId = session.user.id;

  const circles = await db.careCircle.findMany({
    where: { status: "ACTIVE", listedInDirectory: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      circleType: true,
      rotationCadence: true,
      rotationDaysOfWeek: true,
      rotationDayOfWeek: true,
      durationType: true,
      startDate: true,
      endDate: true,
      recipient: { select: { firstName: true, lastName: true } },
      memberships: {
        where: { userId, active: true },
        select: { role: true },
      },
      joinLinks: {
        where: {
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { token: true },
      },
      shifts: {
        where: {
          scheduledDate: { gt: shiftDayCutoff() },
          status: "SCHEDULED",
        },
        orderBy: { scheduledDate: "asc" },
        select: { scheduledDate: true, assignedUserId: true },
      },
    },
  });

  const rows: DirectoryCircle[] = circles.map((circle) => {
    const membership = circle.memberships[0] ?? null;
    const open = circle.shifts.filter((s) => !s.assignedUserId);

    return {
      id: circle.id,
      name: circle.name,
      circleType: circle.circleType,
      recipientName: circle.recipient
        ? `${circle.recipient.firstName} ${circle.recipient.lastName}`
        : null,
      scheduleLabel: describeSchedule(
        getCircleDays(circle),
        circle.rotationCadence,
      ),
      endDateKey:
        circle.durationType === "FIXED" && circle.endDate
          ? toDateKey(circle.endDate)
          : null,
      // Meal trains: how many upcoming days still need someone, and the
      // soonest such day (used for the "needs help soonest" sort)
      openDays: circle.circleType === "MEAL_TRAIN" ? open.length : 0,
      nextOpenDayKey:
        circle.circleType === "MEAL_TRAIN" && open[0]
          ? toDateKey(open[0].scheduledDate)
          : null,
      helperCount: 0, // filled below
      isMember: !!membership,
      isRecipient: membership?.role === "RECIPIENT",
      joinToken: circle.joinLinks[0]?.token ?? null,
    };
  });

  // Helper counts in one query instead of one per circle
  const counts = await db.circleMembership.groupBy({
    by: ["circleId"],
    where: {
      circleId: { in: circles.map((c) => c.id) },
      active: true,
      role: { not: "RECIPIENT" },
    },
    _count: { _all: true },
  });
  const countByCircle = new Map(counts.map((c) => [c.circleId, c._count._all]));
  for (const row of rows) {
    row.helperCount = countByCircle.get(row.id) ?? 0;
  }

  return <FindPage viewerSignedIn={true} circles={rows} />;
}
