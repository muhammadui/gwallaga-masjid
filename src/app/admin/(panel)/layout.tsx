import type { Metadata } from "next";
import { t } from "@/i18n/en";
import { requireAdmin } from "@/lib/auth/require-admin";
import { signOutAction } from "@/actions/auth";
import { Wordmark } from "@/components/site/wordmark";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  title: { template: `%s · ${t.admin.title} · ${t.site.shortName}`, default: t.admin.title },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: t.admin.dashboard },
  { href: "/admin/nikah", label: t.admin.nikah },
  { href: "/admin/donations", label: t.admin.donations },
  { href: "/admin/prayer", label: t.admin.prayer },
];

/** Staff shell: every page under (panel) is gated by requireAdmin(). */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="flex flex-col gap-8 hairline-b bg-limestone-deep/60 px-5 py-6 lg:sticky lg:top-0 lg:h-[100dvh] lg:border-b-0 lg:hairline-l lg:border-l-0 lg:px-6 lg:py-8 lg:[border-right:1px_solid_var(--line)]">
        <div className="flex items-center justify-between lg:block">
          <Wordmark compact />
          <p className="text-eyebrow uppercase text-muted lg:mt-2">{t.admin.title}</p>
        </div>
        <nav aria-label={t.admin.title} className="lg:flex-1">
          <AdminNav items={NAV} />
        </nav>
        <div className="hidden text-[0.8125rem] lg:block">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-muted">{user.email}</p>
          <form action={signOutAction} className="mt-4">
            <button
              type="submit"
              className="h-9 rounded-full px-4 text-[0.8125rem] ring-1 ring-inset ring-line-strong transition-colors duration-500 ease-[var(--ease-spring)] hover:bg-ink hover:text-limestone"
            >
              {t.admin.signOut}
            </button>
          </form>
        </div>
        <form action={signOutAction} className="lg:hidden">
          <button type="submit" className="text-[0.8125rem] text-muted underline">
            {t.admin.signOut}
          </button>
        </form>
      </aside>
      <main id="main" className="min-w-0 px-5 py-10 sm:px-8 lg:px-14 lg:py-14">
        {children}
      </main>
    </div>
  );
}
