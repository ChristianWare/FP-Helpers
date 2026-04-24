// schemas/CreateCircleSchema.ts
import { z } from "zod";
import { US_STATE_VALUES } from "@/lib/states";

export const CreateCircleSchema = z
  .object({
    circleName: z
      .string()
      .trim()
      .min(1, "Please give the circle a name")
      .max(80, "That name is a bit long"),

    // Recipient
    recipientFirstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(50),
    recipientLastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(50),
    recipientEmail: z.string().trim().email("Please enter a valid email"),
    recipientPhone: z
      .string()
      .trim()
      .regex(
        /^(\(\d{3}\) \d{3}-\d{4}|\d{10})$/,
        "Please enter a valid 10-digit phone number",
      ),
    recipientPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    recipientConfirmPassword: z.string(),

    // Address (all optional)
    address: z.string().trim().max(200).optional().or(z.literal("")),
    addressCity: z.string().trim().max(80).optional().or(z.literal("")),
    addressState: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || v === "" || US_STATE_VALUES.includes(v as never),
        "Please pick a valid state",
      ),
    addressZip: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || v === "" || /^\d{5}(-\d{4})?$/.test(v),
        "Please enter a 5-digit ZIP",
      ),
    accessNotes: z.string().trim().max(500).optional().or(z.literal("")),

    // Schedule
    rotationDayOfWeek: z.number().int().min(0).max(6),
    rotationCadence: z.enum(["WEEKLY", "BIWEEKLY"]),
    typicalArrivalTime: z.string().optional().or(z.literal("")),

    // Duration
    durationType: z.enum(["INDEFINITE", "FIXED"]),
    startDate: z.string().optional().or(z.literal("")),
    endDate: z.string().optional().or(z.literal("")),

    organizerInRotation: z.boolean(),
  })
  .refine((data) => data.recipientPassword === data.recipientConfirmPassword, {
    message: "Passwords don't match",
    path: ["recipientConfirmPassword"],
  })
  .refine(
    (data) =>
      data.durationType === "INDEFINITE" ||
      (data.startDate && data.endDate && data.endDate > data.startDate),
    {
      message: "End date must be after start date",
      path: ["endDate"],
    },
  );

export type CreateCircleSchemaType = z.infer<typeof CreateCircleSchema>;
