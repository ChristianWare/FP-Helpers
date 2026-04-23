// schemas/ResetRecipientPasswordSchema.ts
import { z } from "zod";

export const ResetRecipientPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm the password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ResetRecipientPasswordSchemaType = z.infer<
  typeof ResetRecipientPasswordSchema
>;