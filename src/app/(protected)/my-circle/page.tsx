// app/(protected)/my-circle/page.tsx
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import MyCirclePage from "./MyCirclePage";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Find the circle where this user is a RECIPIENT
  const membership = await db.circleMembership.findFirst({
    where: {
      userId: session.user.id,
      role: "RECIPIENT",
      active: true,
    },
    include: {
      circle: {
        include: {
          groceryItems: {
            where: { status: { not: "REMOVED" } },
            orderBy: { createdAt: "desc" },
            include: {
              addedBy: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          prescriptions: {
            where: { active: true },
            orderBy: { createdAt: "desc" },
            include: {
              defaultPharmacy: {
                select: { name: true, phone: true },
              },
            },
          },
          memberships: {
            where: { active: true, role: { not: "RECIPIENT" } },
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // If user is not a recipient on any circle, redirect to dashboard
  if (!membership) {
    redirect("/dashboard");
  }

  const circle = membership.circle;

  return (
    <MyCirclePage
      circleId={circle.id}
      circleName={circle.name}
      userName={session.user.firstName ?? "there"}
      groceryItems={circle.groceryItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes,
        status: item.status,
        addedBy: item.addedBy
          ? `${item.addedBy.firstName} ${item.addedBy.lastName}`
          : null,
      }))}
      prescriptions={circle.prescriptions.map((p) => ({
        id: p.id,
        medicationName: p.medicationName,
        needsPickupThisWeek: p.needsPickupThisWeek,
        pharmacyName: p.defaultPharmacy?.name ?? null,
        pharmacyPhone: p.defaultPharmacy?.phone ?? null,
        notes: p.notes,
      }))}
      helpers={circle.memberships.map((m) => ({
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        phone: m.user.phone,
      }))}
    />
  );
}
