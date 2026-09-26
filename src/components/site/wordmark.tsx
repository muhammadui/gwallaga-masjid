import Link from "next/link";
import { t } from "@/i18n/en";
import { cn } from "@/lib/utils";

/** "Gwallaga" in Fraunces with the Arabic name set beneath. */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" aria-label={t.a11y.home} className={cn("group inline-flex flex-col leading-none", className)}>
      <span className="font-display text-[1.625rem] tracking-[-0.03em] [font-variation-settings:'SOFT'_100,'opsz'_72]">
        {t.site.shortName}
      </span>
      {compact ? null : (
        <span lang="ar" dir="rtl" className="font-arabic-ui mt-1 self-start text-[0.7rem] leading-none text-muted">
          {t.site.nameArabic}
        </span>
      )}
    </Link>
  );
}
