// schemas/UpdateCircleScheduleSchema.ts
import { z } from "zod";
import { US_STATE_VALUES } from "@/lib/states";

export const UpdateCircleScheduleSchema = z
  .object({
    rotationDayOfWeek: z.number().int().min(0).max(6),
    rotationCadence: z.enum(["WEEKLY", "BIWEEKLY"]),
    typicalArrivalTime: z.string().optional().or(z.literal("")),

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

    durationType: z.enum(["INDEFINITE", "FIXED"]),
    startDate: z.string().optional().or(z.literal("")),
    endDate: z.string().optional().or(z.literal("")),
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

export type UpdateCircleScheduleSchemaType = z.infer<
  typeof UpdateCircleScheduleSchema
>;