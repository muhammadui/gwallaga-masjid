import { t } from "@/i18n/en";

/** Primary navigation, shared by header, mobile menu and footer. */
export const NAV_LINKS = [
  { href: "/prayer-times", label: t.nav.prayerTimes },
  { href: "/nikah", label: t.nav.nikah },
  { href: "/donate", label: t.nav.donate },
  { href: "/#the-house", label: t.nav.theHouse },
] as const;
