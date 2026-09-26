/**
 * Idempotent seed: admin user, settings singletons, default nikah slots,
 * bank account (from MASJID_* env), sample campaigns.  Run: `pnpm db:seed`.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { auth } from "../src/lib/auth/server";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("• admin: skipped (set ADMIN_EMAIL and ADMIN_PASSWORD)");
    return;
  }
  // Public sign-up is disabled, so create the user through better-auth's
  // internal adapter and hash with its configured hasher: identical to what
  // sign-up would store, and sign-in verifies against it.
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    const account = await prisma.account.findFirst({ where: { userId: existing.id, providerId: "credential" } });
    if (account) {
      await prisma.account.update({ where: { id: account.id }, data: { password: hash } });
    } else {
      await ctx.internalAdapter.linkAccount({
        userId: existing.id,
        providerId: "credential",
        accountId: existing.id,
        password: hash,
      });
    }
    console.log(`• admin: updated ${email} (role ADMIN, password reset from env)`);
    return;
  }

  const user = await ctx.internalAdapter.createUser(
    { email, name: "Masjid Admin", emailVerified: true },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hash,
  });
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`• admin: created ${email}`);
}

async function seedSettings() {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      masjidName: "Gwallaga Juma'at Masjid",
      address: "Gwallaga, Murtala Muhammad Way, Bauchi",
      phone: process.env.MASJID_PHONE || null,
      whatsapp: process.env.MASJID_WHATSAPP || null,
      nikahFeeKobo: 1_500_000,
    },
    update: {},
  });
  await prisma.prayerSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      fajrIqamahOffset: 25,
      dhuhrIqamahOffset: 15,
      asrIqamahOffset: 15,
      maghribIqamahOffset: 5,
      ishaIqamahOffset: 15,
      jumuahFirst: "13:30",
      hijriOffsetDays: 0,
      calculationMethod: "Egyptian",
    },
    update: {},
  });
  console.log("• settings: SiteSettings + PrayerSettings ready (nikah fee ₦15,000)");
}

async function seedSlots() {
  const slots: { weekday: number; time: string }[] = [];
  for (const weekday of [6, 0]) for (const time of ["10:00", "11:00", "12:00", "16:00"]) slots.push({ weekday, time });
  for (const weekday of [1, 2, 3, 4]) slots.push({ weekday, time: "16:30" });
  for (const s of slots) {
    await prisma.nikahSlot.upsert({
      where: { weekday_time: s },
      create: { ...s, capacity: 1, active: true },
      update: {},
    });
  }
  console.log(`• nikah slots: ${slots.length} (Sat/Sun 10:00, 11:00, 12:00, 16:00; Mon–Thu 16:30)`);
}

async function seedBankAccount() {
  const bankName = process.env.MASJID_BANK_NAME?.trim();
  const accountName = process.env.MASJID_ACCOUNT_NAME?.trim();
  const accountNumber = process.env.MASJID_ACCOUNT_NUMBER?.trim();
  if (!bankName || !accountName || !accountNumber) {
    console.log("• bank account: skipped (MASJID_BANK_NAME / MASJID_ACCOUNT_NAME / MASJID_ACCOUNT_NUMBER not set)");
    return;
  }
  const existing = await prisma.bankAccount.findFirst({ where: { accountNumber } });
  if (existing) {
    await prisma.bankAccount.update({ where: { id: existing.id }, data: { bankName, accountName, active: true } });
  } else {
    await prisma.bankAccount.create({ data: { bankName, accountName, accountNumber, active: true } });
  }
  console.log(`• bank account: ${bankName} ${accountNumber}`);
}

async function seedCampaigns() {
  const campaigns = [
    {
      slug: "masjid-upkeep",
      title: "Masjid Upkeep",
      description: "Electricity, water, cleaning, carpets and the daily care of the house of Allah.",
      purpose: "UPKEEP" as const,
      targetKobo: 500_000_000, // ₦5,000,000
      sortOrder: 1,
    },
    {
      slug: "ramadan-iftar-1448",
      title: "Ramadan Iftar 1448",
      description: "Iftar for fasting worshippers every evening of Ramadan 1448 AH.",
      purpose: "IFTAR" as const,
      targetKobo: 300_000_000, // ₦3,000,000
      sortOrder: 2,
    },
    {
      slug: "orphans-welfare-fund",
      title: "Orphans Welfare Fund",
      description: "School fees, clothing and monthly support for orphans in our community.",
      purpose: "ORPHANS" as const,
      targetKobo: 200_000_000, // ₦2,000,000
      sortOrder: 3,
    },
  ];
  for (const c of campaigns) {
    await prisma.campaign.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }
  console.log(`• campaigns: ${campaigns.map((c) => c.title).join(", ")}`);
}

async function main() {
  await seedAdmin();
  await seedSettings();
  await seedSlots();
  await seedBankAccount();
  await seedCampaigns();
}

main()
  .then(() => console.log("Seed complete."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
