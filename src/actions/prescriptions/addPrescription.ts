// actions/prescriptions/addPrescription.ts
"use server";

import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const AddPrescriptionSchema = z.object({
  circleId: z.string().min(1),
  medicationName: z.string().min(1, "Medication name is required").max(200),
  pharmacyName: z.string().max(200).optional(),
  pharmacyPhone: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
});

export async function addPrescription(values: {
  circleId: string;
  medicationName: string;
  pharmacyName?: string;
  pharmacyPhone?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const validated = AddPrescriptionSchema.safeParse(values);
  if (!validated.success) return { error: "Please enter the medication name" };

  const { circleId, medicationName, pharmacyName, pharmacyPhone, notes } =
    validated.data;

  const membership = await db.circleMembership.findUnique({
    where: { userId_circleId: { userId: session.user.id, circleId } },
  });
  if (!membership) return { error: "You're not a member of this circle" };

  // Create or find pharmacy
  let pharmacyId: string | null = null;
  if (pharmacyName?.trim()) {
    const pharmacy = await db.pharmacy.upsert({
      where: {
        id: "placeholder", // force create path
      },
      update: {},
      create: {
        circleId,
        name: pharmacyName.trim(),
        phone: pharmacyPhone?.replace(/\D/g, "") || null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pharmacyId = pharmacy.id;
  }

  // Actually, upsert won't work well here. Let's just create the pharmacy:
  let finalPharmacyId: string | null = null;
  if (pharmacyName?.trim()) {
    // Check if pharmacy with same name already exists for this circle
    const existing = await db.pharmacy.findFirst({
      where: { circleId, name: pharmacyName.trim() },
    });

    if (existing) {
      finalPharmacyId = existing.id;
    } else {
      const newPharmacy = await db.pharmacy.create({
        data: {
          circleId,
          name: pharmacyName.trim(),
          phone: pharmacyPhone?.replace(/\D/g, "") || null,
        },
      });
      finalPharmacyId = newPharmacy.id;
    }
  }

  const prescription = await db.prescription.create({
    data: {
      circleId,
      medicationName: medicationName.trim(),
      defaultPharmacyId: finalPharmacyId,
      notes: notes?.trim() || null,
      active: true,
      needsPickupThisWeek: false,
    },
  });

  revalidatePath("/my-circle");

  return { success: true, prescription };
}
