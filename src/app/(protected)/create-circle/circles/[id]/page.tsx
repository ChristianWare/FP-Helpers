// app/(protected)/circles/[id]/page.tsx
import { auth } from "../../../../../../auth";
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

  // Get the circle with everything we need
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

  // Check that the user is a member of this circle
  const membership = circle.memberships.find(
    (m) => m.userId === session.user.id,
  );
  if (!membership && !session.user.isSuperAdmin) {
    redirect("/dashboard");
  }

  // Figure out the join URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = circle.joinLinks[0]
    ? `${baseUrl}/join/${circle.joinLinks[0].token}`
    : null;

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
      currentUserRole={membership?.role ?? null}
      joinUrl={joinUrl}
      justCreated={justCreated}
    />
  );
}
