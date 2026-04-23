// schemas/UpdateRecipientSchema.ts
import { z } from "zod";

export const UpdateRecipientSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name is too long"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name is too long"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\(\d{3}\) \d{3}-\d{4}|\d{10})$/,
      "Please enter a valid 10-digit phone number",
    ),
});

export type UpdateRecipientSchemaType = z.infer<typeof UpdateRecipientSchema>;
