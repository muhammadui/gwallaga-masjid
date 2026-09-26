/**
 * English UI strings. Every user-facing string in the shell goes through here
 * so a Hausa dictionary (src/i18n/ha.ts, same shape) can be added later
 * without touching components. Arabic appears only as liturgical text.
 *
 *   import { t } from "@/i18n/en";
 *   <span>{t.nav.donate}</span>
 */
export const t = {
  site: {
    name: "Gwallaga Juma'at Masjid",
    shortName: "Gwallaga",
    nameArabic: "مسجد غوالاغا الجامع",
    description:
      "Gwallaga Juma'at Masjid, Bauchi. Daily prayer times, Jumu'ah, nikah bookings and giving, from the house on Murtala Muhammad Way.",
    city: "Bauchi",
  },
  a11y: {
    skipToContent: "Skip to content",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    primaryNav: "Primary",
    footerNav: "Footer",
    home: "Gwallaga Juma'at Masjid, home",
  },
  nav: {
    prayerTimes: "Prayer times",
    nikah: "Nikah",
    donate: "Donate",
    theHouse: "The House",
    menu: "Menu",
    close: "Close",
  },
  header: {
    nextPrayer: "Next",
  },
  buttons: {
    donate: "Give now",
    bookNikah: "Book a date",
    viewTimes: "Full timetable",
    learnMore: "Learn more",
    continue: "Continue",
    back: "Back",
    submit: "Submit",
    signIn: "Sign in",
    signOut: "Sign out",
    copy: "Copy",
    copied: "Copied",
  },
  footer: {
    visit: "Visit",
    contact: "Contact",
    quickLinks: "Quick links",
    giveByTransfer: "Give by bank transfer",
    bank: "Bank",
    accountName: "Account name",
    accountNumber: "Account number",
    phone: "Phone",
    whatsapp: "WhatsApp",
    builtWithLove: "Built with love for the Ummah.",
    rights: "All rights reserved.",
    admin: "Staff sign-in",
  },
  admin: {
    title: "Admin",
    dashboard: "Dashboard",
    nikah: "Nikah",
    donations: "Donations",
    prayer: "Prayer",
    signOut: "Sign out",
    signInTitle: "Staff sign-in",
    signInLede: "For imams, registrars and masjid administrators.",
    email: "Email",
    password: "Password",
    signingIn: "Signing in…",
    invalidCredentials: "That email and password did not match.",
    forbidden: "Your account does not have access to the admin panel.",
    bookingsByStatus: "Nikah bookings by status",
    donationsThisMonth: "Donations this month",
    successfulGifts: "successful gifts",
    pendingTransfers: "bank transfers awaiting confirmation",
    activeCampaigns: "Active campaigns",
    raised: "raised of",
  },
  status: {
    PENDING_PAYMENT: "Awaiting payment",
    PAID: "Paid",
    CONFIRMED: "Confirmed",
    SOLEMNIZED: "Solemnized",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
  },
  forms: {
    required: "Required",
    optional: "Optional",
  },
} as const;

export type Dictionary = typeof t;
