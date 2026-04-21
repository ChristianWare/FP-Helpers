// app/(auth)/join/[token]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import JoinPage from "./JoinPage";

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

  // Check if link is still valid
  const isExpired = joinLink.expiresAt && joinLink.expiresAt < new Date();
  const isInactive = !joinLink.active;

  if (isExpired || isInactive) {
    return (
      <JoinPage
        token={token}
        circleName={joinLink.circle.name}
        recipientName={
          joinLink.circle.recipient
            ? `${joinLink.circle.recipient.firstName} ${joinLink.circle.recipient.lastName}`
            : null
        }
        status={isExpired ? "expired" : "inactive"}
      />
    );
  }

  return (
    <JoinPage
      token={token}
      circleName={joinLink.circle.name}
      recipientName={
        joinLink.circle.recipient
          ? `${joinLink.circle.recipient.firstName} ${joinLink.circle.recipient.lastName}`
          : null
      }
      status='valid'
    />
  );
}
