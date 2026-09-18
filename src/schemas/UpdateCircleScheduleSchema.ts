// schemas/UpdateCircleScheduleSchema.ts
import { z } from "zod";
import { US_STATE_VALUES } from "@/lib/states";
import { refineSchedule, scheduleFieldShape } from "@/schemas/scheduleFields";

export const UpdateCircleScheduleSchema = z
  .object({
    // Days, cadence, arrival time, duration (shared with the create wizard)
    ...scheduleFieldShape,

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
  })
  .superRefine(refineSchedule);

export type UpdateCircleScheduleSchemaType = z.infer<
  typeof UpdateCircleScheduleSchema
>;
