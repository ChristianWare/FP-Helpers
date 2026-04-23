// schemas/CreateCircleSchema.ts
import { z } from "zod";

const phoneRegex = /^[+]?[\d\s()-]{10,20}$/;

export const CreateCircleSchema = z
  .object({
    circleName: z
      .string()
      .min(1, { message: "Please give the circle a name" })
      .max(80, { message: "Circle name is too long" }),

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
    recipientPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    recipientConfirmPassword: z.string(),

    address: z.string().max(300).optional(),
    accessNotes: z.string().max(500).optional(),

    rotationDayOfWeek: z.number().min(0).max(6),
    rotationCadence: z.enum(["WEEKLY", "BIWEEKLY"]),
    typicalArrivalTime: z.string().max(50).optional(),

    // Duration
    durationType: z.enum(["INDEFINITE", "FIXED"]),
    startDate: z.string().optional(), // ISO date string from form
    endDate: z.string().optional(),

    organizerInRotation: z.boolean(),
  })
  .refine((data) => data.recipientPassword === data.recipientConfirmPassword, {
    message: "Passwords don't match",
    path: ["recipientConfirmPassword"],
  })
  .refine(
    (data) => {
      if (data.durationType === "FIXED") {
        return !!data.startDate && !!data.endDate;
      }
      return true;
    },
    {
      message: "Please enter a start and end date",
      path: ["endDate"],
    },
  )
  .refine(
    (data) => {
      if (data.durationType === "FIXED" && data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    },
  );

export type CreateCircleSchemaType = z.infer<typeof CreateCircleSchema>;
