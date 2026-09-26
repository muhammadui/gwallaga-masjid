import "server-only";
import type { NikahBooking } from "@/lib/db";
import { getPrayerSettings, getSiteSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { t } from "@/i18n/en";
import { generateNikahCertificate } from "./certificate";
import { certificateNoForBookingRef, certificateSlug } from "./format";
import { hijriString } from "./hijri-string";

/** Render the certificate PDF for a booking at a given solemnization moment. */
export async function renderCertificate(
  booking: NikahBooking,
  opts: { solemnizedAt: Date; officiantName: string; issuedAt: Date },
): Promise<{ certificateNo: string; pdf: Uint8Array }> {
  const [site, prayer] = await Promise.all([getSiteSettings(), getPrayerSettings()]);
  const certificateNo = certificateNoForBookingRef(booking.bookingRef);
  const pdf = await generateNikahCertificate(
    { ...booking, solemnizedAt: opts.solemnizedAt },
    {
      certificateNo,
      issuedAt: opts.issuedAt,
      officiantName: opts.officiantName,
      hijriDate: hijriString(opts.solemnizedAt, prayer.hijriOffsetDays),
      verifyUrl: absoluteUrl(`/verify/${certificateSlug(certificateNo)}`),
      masjidName: site.masjidName,
      city: t.site.city,
    },
  );
  return { certificateNo, pdf };
}
