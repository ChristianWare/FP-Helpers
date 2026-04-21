// schemas/RegisterSchema.ts
import { z } from "zod";

const phoneRegex = /^[+]?[\d\s()-]{10,20}$/;

export const RegisterSchema = z
  .object({
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
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
    website: z.string().optional(), // honeypot
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;
