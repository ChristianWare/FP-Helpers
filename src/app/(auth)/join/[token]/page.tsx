// app/(auth)/join/[token]/page.tsx
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import JoinPage from "./JoinPage";
import {
  describeSchedule,
  getCircleDays,
  shiftDayCutoff,
} from "@/lib/shifts/scheduleDates";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const joinLink = await db.circleJoinLink.findUnique({
    where: { token },
    include: {
      circle: {
        include: {
          recipient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!joinLink) notFound();

  const circle = joinLink.circle;
  const recipientName = circle.recipient
    ? `${circle.recipient.firstName} ${circle.recipient.lastName}`
    : null;

  // Check if link is still valid
  const isExpired = joinLink.expiresAt && joinLink.expiresAt < new Date();
  const isInactive = !joinLink.active || circle.status === "ARCHIVED";

  if (isExpired || isInactive) {
    return (
      <JoinPage
        token={token}
        circleId={circle.id}
        circleName={circle.name}
        circleType={circle.circleType}
        recipientName={recipientName}
        status={isExpired ? "expired" : "inactive"}
        viewer={null}
        slots={[]}
        mealInfo={null}
      />
    );
  }

  // ——— Who's looking? ———
  // Someone who's already signed in shouldn't be asked to create an account
  // (they couldn't anyway — their email is taken). They get a one-tap join.
  const session = await auth();
  let viewer: {
    firstName: string;
    isMember: boolean;
    isRecipient: boolean;
  } | null = null;

  if (session?.user?.id) {
    const membership = await db.circleMembership.findUnique({
      where: {
        userId_circleId: { userId: session.user.id, circleId: circle.id },
      },
      select: { role: true, active: true },
    });
    viewer = {
      firstName: session.user.firstName ?? "there",
      isMember: !!membership?.active,
      isRecipient:
        membership?.role === "RECIPIENT" ||
        circle.recipientId === session.user.id,
    };
  }

  // ——— Meal train: the calendar comes first ———
  // This page is public (the token is the only credential), so it shows
  // first names and meals only — never last names, phone numbers or the
  // address. Those stay behind sign-in.
  const isMealTrain = circle.circleType === "MEAL_TRAIN";

  const slots = isMealTrain
    ? (
        await db.shift.findMany({
          where: {
            circleId: circle.id,
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
            scheduledDate: { gt: shiftDayCutoff() },
          },
          orderBy: { scheduledDate: "asc" },
          take: 200,
          select: {
            id: true,
            scheduledDate: true,
            mealDescription: true,
            assignedUser: { select: { firstName: true } },
          },
        })
      ).map((s) => ({
        id: s.id,
        scheduledDate: s.scheduledDate.toISOString(),
        takenBy: s.assignedUser?.firstName ?? null,
        mealDescription: s.assignedUser ? s.mealDescription : null,
      }))
    : [];

  const mealInfo = isMealTrain
    ? {
        householdSize: circle.mealHouseholdSize,
        allergies: circle.mealAllergies,
        preferences: circle.mealPreferences,
        dropoffTime: circle.typicalArrivalTime,
        scheduleLabel: describeSchedule(
          getCircleDays(circle),
          circle.rotationCadence,
        ),
      }
    : null;

  return (
    <JoinPage
      token={token}
      circleId={circle.id}
      circleName={circle.name}
      circleType={circle.circleType}
      recipientName={recipientName}
      status='valid'
      viewer={viewer}
      slots={slots}
      mealInfo={mealInfo}
    />
  );
}
