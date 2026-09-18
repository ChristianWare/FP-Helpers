// schemas/MealSchemas.ts
import { z } from "zod";

const mealDescription = z
  .string()
  .trim()
  .max(120, "Keep it short — e.g. “Chicken enchiladas and rice”")
  .optional()
  .or(z.literal(""));

const mealNotes = z
  .string()
  .trim()
  .max(500, "That note is a bit long")
  .optional()
  .or(z.literal(""));

/** What someone is bringing on a day they've claimed. Both fields optional. */
export const MealSchema = z.object({
  mealDescription,
  mealNotes,
});
export type MealSchemaType = z.infer<typeof MealSchema>;

/** One day picked on the join page or the meal calendar. */
export const SlotSelectionSchema = z.object({
  shiftId: z.string().min(1).max(60),
  mealDescription,
  mealNotes,
});
export type SlotSelection = z.infer<typeof SlotSelectionSchema>;

export const SlotSelectionsSchema = z.array(SlotSelectionSchema).max(60);

/** Household + dietary info for a meal train. */
export const MealDetailsSchema = z.object({
  mealHouseholdSize: z
    .string()
    .trim()
    .max(80, "Keep this short — e.g. “2 adults, 3 kids”")
    .optional()
    .or(z.literal("")),
  mealAllergies: z.string().trim().max(500).optional().or(z.literal("")),
  mealPreferences: z.string().trim().max(500).optional().or(z.literal("")),
});
export type MealDetailsSchemaType = z.infer<typeof MealDetailsSchema>;
