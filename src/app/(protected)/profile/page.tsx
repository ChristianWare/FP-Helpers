// app/(protected)/profile/page.tsx
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfilePage from "./ProfilePage";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      emailOptIn: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  const circleCount = await db.circleMembership.count({
    where: { userId: user.id, active: true },
  });

  const adminCircleCount = await db.circleMembership.count({
    where: { userId: user.id, active: true, role: "ADMIN" },
  });

  return (
    <ProfilePage
      user={{
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        emailOptIn: user.emailOptIn,
        memberSinceIso: user.createdAt.toISOString(),
      }}
      circleCount={circleCount}
      adminCircleCount={adminCircleCount}
    />
  );
}
