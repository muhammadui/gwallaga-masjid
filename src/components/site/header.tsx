"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { t } from "@/i18n/en";
import { cn } from "@/lib/utils";
import { preloaderActive } from "@/lib/preloader";
import { Container } from "@/components/ui/container";
import { StarPattern } from "@/components/ui/star-pattern";
import { NAV_LINKS } from "./nav-links";
import { Wordmark } from "./wordmark";

gsap.registerPlugin(useGSAP);

export interface HeaderProps {
  /**
   * Server-rendered "Next: Asr 15:42" content for the right-hand pill.
   * The prayer engine passes it in; the pill is hidden when omitted.
   */
  nextPrayerSlot?: ReactNode;
  /** Scroll distance (px) after which the header turns solid. */
  solidAfter?: number;
}

/**
 * Fixed floating header: transparent over the hero, then a solid limestone
 * island once the page scrolls. Mobile: full-screen overlay menu with a
 * staggered reveal (transform/opacity only; instant under reduced motion).
 */
export function Header({ nextPrayerSlot, solidAfter = 48 }: HeaderProps) {
  const [solid, setSolid] = useState(false);
  const [compact, setCompact] = useState(false);
  const compactSentinel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const pathname = usePathname();
  const lenis = useLenis();

  // Solid state via IntersectionObserver on a top-of-page sentinel (no scroll listeners).
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setSolid(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Compact wordmark once the hero has scrolled away (or, on pages without a
  // hero, together with the solid state). The sentinel is sized to the hero.
  useEffect(() => {
    const el = compactSentinel.current;
    if (!el) return;
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const size = () => {
      el.style.height = `${hero ? Math.max(hero.offsetHeight - 96, solidAfter) : solidAfter}px`;
    };
    size();
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    const ro = hero ? new ResizeObserver(size) : null;
    if (hero) ro?.observe(hero);
    return () => {
      io.disconnect();
      ro?.disconnect();
    };
  }, [pathname, solidAfter]);

  // Build the menu timeline once.
  useGSAP(
    () => {
      const root = overlay.current;
      if (!root) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.set(root, { autoAlpha: 0 });
      const items = root.querySelectorAll<HTMLElement>("[data-menu-item]");
      const meta = root.querySelectorAll<HTMLElement>("[data-menu-meta]");
      tl.current = gsap
        .timeline({ paused: true, defaults: { ease: "expo.out" } })
        .to(root, { autoAlpha: 1, duration: reduced ? 0 : 0.5, ease: "power2.out" })
        .fromTo(
          items,
          { yPercent: reduced ? 0 : 110, opacity: reduced ? 1 : 0 },
          { yPercent: 0, opacity: 1, duration: reduced ? 0 : 1.1, stagger: reduced ? 0 : 0.07 },
          reduced ? 0 : 0.12,
        )
        .fromTo(meta, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : 0.6 }, reduced ? 0 : 0.45);
    },
    { scope: overlay },
  );

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) {
      tl.current?.timeScale(1).play();
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
      overlay.current?.querySelector<HTMLElement>("[data-menu-item] a")?.focus();
    } else {
      tl.current?.timeScale(1.6).reverse();
      // The brand preloader holds Lenis until it has gone (see LenisGate).
      if (!preloaderActive()) lenis?.start();
      document.documentElement.style.overflow = "";
    }
  }, [open, lenis]);

  // Close on route change (state adjusted during render, not in an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-0" style={{ height: solidAfter }} />
      <div ref={compactSentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-12" />

      {/*
        data-site-header: the home choreography sets data-theme="dark" here
        while the indigo Minbar section is on screen (header only).
      */}
      <header
        data-site-header
        data-compact={compact && !open ? "true" : "false"}
        className="group/header fixed inset-x-0 top-0 z-(--z-header) pt-3 text-fg sm:pt-4"
      >
        <Container size="wide">
          <div
            className={cn(
              "flex h-16 items-center justify-between gap-6 rounded-full pl-5 pr-2 sm:pl-7",
              "transition-[background-color,color,box-shadow,backdrop-filter] duration-700 ease-[var(--ease-spring)]",
              solid || open
                ? cn(
                    "bg-limestone/85 text-ink shadow-[0_1px_0_rgba(27,24,21,0.06),0_24px_60px_-32px_rgba(27,24,21,0.35)] ring-1 ring-ink/[0.07] backdrop-blur-xl",
                    "dark:bg-indigo-deep/80 dark:text-limestone dark:shadow-[0_24px_60px_-32px_rgba(0,0,0,0.6)] dark:ring-limestone/10",
                  )
                : "bg-transparent",
            )}
          >
            <Wordmark />

            <nav aria-label={t.a11y.primaryNav} className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={isActive(l.href) ? "page" : undefined}
                      className={cn(
                        "relative rounded-full px-4 py-2 text-[0.875rem] tracking-[-0.005em] transition-colors duration-500 ease-[var(--ease-spring)]",
                        "hover:bg-ink/[0.05] aria-[current=page]:text-indigo dark:hover:bg-limestone/10 dark:aria-[current=page]:text-sand",
                        "after:absolute after:inset-x-4 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-[var(--ease-out-expo)] hover:after:scale-x-100 aria-[current=page]:after:scale-x-100",
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              {nextPrayerSlot ? (
                <div
                  className={cn(
                    "hidden h-12 items-center gap-2.5 rounded-full px-4 text-[0.8125rem] tabular-nums sm:inline-flex",
                    "bg-ink/[0.04] ring-1 ring-inset ring-ink/10 dark:bg-limestone/[0.06] dark:ring-limestone/15",
                  )}
                >
                  <span aria-hidden className="relative flex size-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-indigo/50 motion-reduce:hidden dark:bg-sand/50" />
                    <span className="relative size-1.5 rounded-full bg-indigo dark:bg-sand" />
                  </span>
                  <span className="text-muted">{t.header.nextPrayer}:</span>
                  <span className="font-medium">{nextPrayerSlot}</span>
                </div>
              ) : null}

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="site-menu"
                aria-label={open ? t.a11y.closeMenu : t.a11y.openMenu}
                className="group relative inline-flex h-12 items-center gap-3 rounded-full pl-4 pr-1.5 text-[0.8125rem] font-medium lg:hidden"
              >
                <span className="sr-only sm:not-sr-only">{open ? t.nav.close : t.nav.menu}</span>
                <span className="relative flex size-9 items-center justify-center rounded-full bg-ink text-limestone transition-colors duration-700 ease-[var(--ease-spring)] dark:bg-limestone dark:text-indigo">
                  <span
                    className={cn(
                      "absolute h-px w-4 bg-current transition-transform duration-500 ease-[var(--ease-spring)]",
                      open ? "rotate-45" : "-translate-y-[3px]",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute h-px w-4 bg-current transition-transform duration-500 ease-[var(--ease-spring)]",
                      open ? "-rotate-45" : "translate-y-[3px]",
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </Container>
      </header>

      <div
        ref={overlay}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t.a11y.primaryNav}
        inert={!open}
        className="invisible fixed inset-0 z-(--z-overlay) overflow-hidden bg-limestone/95 text-ink opacity-0 backdrop-blur-2xl lg:hidden"
      >
        <StarPattern className="absolute inset-0 text-clay" opacity={0.1} size={160} />
        <Container size="wide" className="relative flex h-full flex-col pt-28 pb-10">
          <nav aria-label={t.a11y.primaryNav} className="flex-1">
            <ul className="flex flex-col">
              {NAV_LINKS.map((l, i) => (
                <li key={l.href} className="overflow-hidden hairline-b">
                  <div data-menu-item>
                    <Link
                      href={l.href}
                      onClick={close}
                      aria-current={isActive(l.href) ? "page" : undefined}
                      className="flex items-baseline justify-between py-5 font-display text-[clamp(2.5rem,11vw,4.5rem)] leading-none tracking-[-0.03em] aria-[current=page]:text-indigo"
                    >
                      <span>{l.label}</span>
                      <span className="font-sans text-eyebrow tracking-[0.22em] text-muted tabular-nums">
                        0{i + 1}
                      </span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </nav>
          <div data-menu-meta className="flex items-end justify-between gap-6 pt-8 text-[0.8125rem] text-muted">
            <span>{t.site.name}</span>
            <span lang="ar" dir="rtl" className="font-arabic text-[1.2rem] text-ink/70">
              {t.site.nameArabic}
            </span>
          </div>
        </Container>
      </div>
    </>
  );
}
