// schemas/UpdateProfileSchema.ts
import { z } from "zod";

const phoneRegex = /^[+]?[\d\s()-]{10,20}$/;

export const UpdateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: "First name is required" })
    .max(50, { message: "First name is too long" }),
  lastName: z
    .string()
    .min(1, { message: "Last name is required" })
    .max(50, { message: "Last name is too long" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z
    .string()
    .min(10, { message: "Please enter a valid phone number" })
    .regex(phoneRegex, { message: "Please enter a valid phone number" }),
  emailOptIn: z.boolean(),
});

export type UpdateProfileSchemaType = z.infer<typeof UpdateProfileSchema>;
