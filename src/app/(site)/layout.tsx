import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

// Footer reads SiteSettings/BankAccount: refresh the static shell every 5 minutes
// (admin mutations should also call revalidatePath("/", "layout")).
export const revalidate = 300;

/**
 * Public shell. Pages render inside <main id="main">. The header's next-prayer
 * pill is filled by the prayer engine (pass `nextPrayerSlot`).
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
