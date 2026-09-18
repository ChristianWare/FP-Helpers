// schemas/CreateCircleSchema.ts
import { z } from "zod";
import { US_STATE_VALUES } from "@/lib/states";
import { refineSchedule, scheduleFieldShape } from "@/schemas/scheduleFields";

export const CreateCircleSchema = z
  .object({
    // Step 1 — what kind of circle
    circleType: z.enum(["STANDARD", "MEAL_TRAIN"]),

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

    // Duration + schedule (shared with the schedule editor)
    ...scheduleFieldShape,

    // Final step — standard circles
    organizerInRotation: z.boolean(),

    // Final step — meal trains (all optional)
    mealHouseholdSize: z
      .string()
      .trim()
      .max(80, "Keep this short — e.g. “2 adults, 3 kids”")
      .optional()
      .or(z.literal("")),
    mealAllergies: z.string().trim().max(500).optional().or(z.literal("")),
    mealPreferences: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.recipientPassword === data.recipientConfirmPassword, {
    message: "Passwords don't match",
    path: ["recipientConfirmPassword"],
  })
  .superRefine(refineSchedule);

export type CreateCircleSchemaType = z.infer<typeof CreateCircleSchema>;
