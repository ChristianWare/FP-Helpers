// actions/prescriptions/removePrescription.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function removePrescription(prescriptionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const prescription = await db.prescription.findUnique({
    where: { id: prescriptionId },
  });

  if (!prescription) return { error: "Prescription not found" };

  const membership = await db.circleMembership.findUnique({
    where: {
      userId_circleId: {
        userId: session.user.id,
        circleId: prescription.circleId,
      },
    },
  });
  if (!membership) return { error: "You're not a member of this circle" };

  await db.prescription.update({
    where: { id: prescriptionId },
    data: { active: false },
  });

  revalidatePath("/my-circle");

  return { success: true };
}
