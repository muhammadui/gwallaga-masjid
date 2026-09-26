import { cache } from "react";
import { prisma } from "@/lib/db";
import type { BankAccount, PrayerSettings, SiteSettings } from "@prisma/client";

/** Defaults used when the singleton row has not been seeded yet. */
export const DEFAULT_SITE_SETTINGS: Omit<SiteSettings, "updatedAt"> = {
  id: "default",
  masjidName: "Gwallaga Juma'at Masjid",
  address: "Gwallaga, Murtala Muhammad Way, Bauchi",
  phone: null,
  whatsapp: null,
  email: null,
  nikahFeeKobo: 1_500_000,
  updatedBy: null,
};

export const DEFAULT_PRAYER_SETTINGS: Omit<PrayerSettings, "updatedAt"> = {
  id: "default",
  fajrIqamahOffset: 25,
  dhuhrIqamahOffset: 15,
  asrIqamahOffset: 15,
  maghribIqamahOffset: 5,
  ishaIqamahOffset: 15,
  jumuahFirst: "13:30",
  jumuahSecond: null,
  hijriOffsetDays: 0,
  calculationMethod: "Egyptian",
  updatedBy: null,
};

/** Site-wide settings singleton (name, address, phone, WhatsApp, nikah fee). Request-deduped. */
export const getSiteSettings = cache(async () => {
  const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  return row ?? { ...DEFAULT_SITE_SETTINGS, updatedAt: new Date(0) };
});

/** Prayer settings singleton (iqamah offsets, Jumu'ah times, Hijri offset). Request-deduped. */
export const getPrayerSettings = cache(async () => {
  const row = await prisma.prayerSettings.findUnique({ where: { id: "default" } });
  return row ?? { ...DEFAULT_PRAYER_SETTINGS, updatedAt: new Date(0) };
});

/** The active masjid bank account for manual transfers, or null. Request-deduped. */
export const getBankAccount = cache(async (): Promise<BankAccount | null> => {
  return prisma.bankAccount.findFirst({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
  });
});
