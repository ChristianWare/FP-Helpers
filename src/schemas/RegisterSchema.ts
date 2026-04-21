// schemas/RegisterSchema.ts
import { z } from "zod";

export const RegisterSchema = z
  .object({
    name: z.string().min(2, { message: "Please enter your name" }),
    email: z.string().email({ message: "Please enter a valid email" }),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
    // Honeypot — bots fill this, humans don't
    website: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;
