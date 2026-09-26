import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { HeaderNextPrayer } from "@/components/prayer/header-next-prayer";
import { getPrayerSnapshot } from "@/lib/prayer/server";

// Footer reads SiteSettings/BankAccount: refresh the static shell every 5 minutes
// (admin mutations should also call revalidatePath("/", "layout")).
export const revalidate = 300;

/**
 * Public shell. Pages render inside <main id="main">. The header's next-prayer
 * pill is computed from today's PrayerDay and kept live client-side.
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { serverNow, config, today } = await getPrayerSnapshot();

  return (
    <>
      <Header nextPrayerSlot={<HeaderNextPrayer day={today} config={config} serverNow={serverNow} />} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
