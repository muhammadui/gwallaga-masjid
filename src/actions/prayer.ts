"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prayerSettingsSchema, type PrayerSettingsInput } from "@/lib/validation/prayer";

export type SavePrayerSettingsResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof PrayerSettingsInput, string>> };

/** Save iqamah offsets, Jumu'ah times, Hijri offset and calculation method. Staff only. */
export async function savePrayerSettings(input: PrayerSettingsInput): Promise<SavePrayerSettingsResult> {
  const { user } = await requireAdmin();

  const parsed = prayerSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof PrayerSettingsInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof PrayerSettingsInput | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Some fields need attention.", fieldErrors };
  }

  const data = {
    ...parsed.data,
    jumuahSecond: parsed.data.jumuahSecond || null,
    updatedBy: user.email,
  };

  try {
    const row = await prisma.prayerSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
    revalidatePath("/", "layout");
    revalidatePath("/prayer-times");
    revalidatePath("/admin/prayer");
    return { ok: true, updatedAt: row.updatedAt.toISOString() };
  } catch (error) {
    console.error("[prayer] save failed", error);
    return { ok: false, error: "Could not save right now. Please try again." };
  }
}
