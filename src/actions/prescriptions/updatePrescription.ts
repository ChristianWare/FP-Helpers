// actions/prescriptions/updatePrescription.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updatePrescription(values: {
  prescriptionId: string;
  medicationName: string;
  pharmacyName?: string;
  pharmacyPhone?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  if (!values.medicationName.trim())
    return { error: "Medication name is required" };

  const prescription = await db.prescription.findUnique({
    where: { id: values.prescriptionId },
    include: { defaultPharmacy: true },
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

  // Handle pharmacy update/create
  let pharmacyId: string | null = prescription.defaultPharmacyId;

  if (values.pharmacyName?.trim()) {
    const existing = await db.pharmacy.findFirst({
      where: {
        circleId: prescription.circleId,
        name: values.pharmacyName.trim(),
      },
    });

    if (existing) {
      pharmacyId = existing.id;
      // Update phone if changed
      if (values.pharmacyPhone?.trim()) {
        await db.pharmacy.update({
          where: { id: existing.id },
          data: { phone: values.pharmacyPhone.replace(/\D/g, "") },
        });
      }
    } else {
      const newPharmacy = await db.pharmacy.create({
        data: {
          circleId: prescription.circleId,
          name: values.pharmacyName.trim(),
          phone: values.pharmacyPhone?.replace(/\D/g, "") || null,
        },
      });
      pharmacyId = newPharmacy.id;
    }
  } else {
    pharmacyId = null;
  }

  await db.prescription.update({
    where: { id: values.prescriptionId },
    data: {
      medicationName: values.medicationName.trim(),
      defaultPharmacyId: pharmacyId,
      notes: values.notes?.trim() || null,
    },
  });

  revalidatePath("/my-circle");

  return { success: true };
}
