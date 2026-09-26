import type { Metadata, Viewport } from "next";
import { Amiri, Fraunces, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { t } from "@/i18n/en";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    template: `%s · ${t.site.name}`,
    default: t.site.name,
  },
  description: t.site.description,
  applicationName: t.site.name,
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: t.site.name,
    title: t.site.name,
    description: t.site.description,
    url: appUrl,
  },
  twitter: { card: "summary_large_image", title: t.site.name, description: t.site.description },
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${amiri.variable} ${plexArabic.variable}`}
    >
      <body className="grain bg-ground text-fg antialiased">
        <a href="#main" className="skip-link">
          {t.a11y.skipToContent}
        </a>
        <SmoothScroll>{children}</SmoothScroll>
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-2xl !border !border-line !bg-ground !text-fg !shadow-[0_20px_60px_-24px_rgba(27,24,21,0.35)] !font-sans",
            },
          }}
        />
      </body>
    </html>
  );
}
