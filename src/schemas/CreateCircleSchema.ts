// schemas/CreateCircleSchema.ts
import { z } from "zod";

const phoneRegex = /^[+]?[\d\s()-]{10,20}$/;

export const CreateCircleSchema = z.object({
  // Circle-level
  circleName: z
    .string()
    .min(1, { message: "Please give the circle a name" })
    .max(80, { message: "Circle name is too long" }),

  // Recipient info
  recipientFirstName: z
    .string()
    .min(1, { message: "Recipient's first name is required" })
    .max(50),
  recipientLastName: z
    .string()
    .min(1, { message: "Recipient's last name is required" })
    .max(50),
  recipientEmail: z
    .string()
    .email({ message: "Please enter a valid email for the recipient" }),
  recipientPhone: z
    .string()
    .min(10, { message: "Please enter a valid phone number" })
    .regex(phoneRegex, { message: "Please enter a valid phone number" }),

  // Location
  address: z.string().max(300).optional(),
  accessNotes: z.string().max(500).optional(),

  // Rotation settings
  rotationDayOfWeek: z.number().min(0).max(6),
  rotationCadence: z.enum(["WEEKLY", "BIWEEKLY"]),
  typicalArrivalTime: z.string().max(50).optional(),

  // Organizer participation
  organizerInRotation: z.boolean(),
});

export type CreateCircleSchemaType = z.infer<typeof CreateCircleSchema>;
