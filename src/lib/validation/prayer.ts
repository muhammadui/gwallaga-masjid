import { z } from "zod";
import { CALCULATION_METHODS } from "@/lib/prayer/constants";

const offset = z
  .number({ error: "Enter minutes" })
  .int("Whole minutes only")
  .min(0, "Cannot be negative")
  .max(90, "At most 90 minutes");

const clock = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, e.g. 13:30");

/** Admin prayer settings form. `jumuahSecond` is "" when there is only one Jumu'ah. */
export const prayerSettingsSchema = z
  .object({
    fajrIqamahOffset: offset,
    dhuhrIqamahOffset: offset,
    asrIqamahOffset: offset,
    maghribIqamahOffset: offset,
    ishaIqamahOffset: offset,
    jumuahFirst: clock,
    jumuahSecond: z.union([clock, z.literal("")]),
    hijriOffsetDays: z.number().int().min(-1, "−1, 0 or +1").max(1, "−1, 0 or +1"),
    calculationMethod: z.enum(CALCULATION_METHODS as unknown as [string, ...string[]], { error: "Choose a method" }),
  })
  .refine((v) => !v.jumuahSecond || v.jumuahSecond > v.jumuahFirst, {
    path: ["jumuahSecond"],
    message: "The second Jumu'ah must be after the first",
  });

export type PrayerSettingsInput = z.infer<typeof prayerSettingsSchema>;
