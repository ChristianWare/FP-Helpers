import { z } from "zod";

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;
