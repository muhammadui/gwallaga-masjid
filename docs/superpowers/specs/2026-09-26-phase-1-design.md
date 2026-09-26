# Gwallaga Masjid Platform — Phase 1 Design

Companion to `docs/research/2026-09-25-discovery-research.md`. Read that first for context.

## Goal of phase 1
A runnable, visually stunning first cut that proves the three faces of the product:
1. **The House** — cinematic home page for the masjid.
2. **The Service Desk** — live prayer strip, next-prayer countdown, Hijri date, qibla.
3. **Nikah** — the full marriage-booking-to-certificate flow, end to end.
4. **Giving** — a donation page that accepts money online (Paystack: card, bank transfer, USSD) and by manual bank transfer.

## Stack (house stack, mirrors ../wia)
- Next.js 16 (App Router, `src/`), React 19, TypeScript strict, Tailwind 4, shadcn/radix for form primitives only.
- **Next 16 has breaking changes vs training data. Before writing any Next code read the relevant guide in `node_modules/next/dist/docs/`.**
- Prisma 7 + `@prisma/adapter-pg` on Neon (pooled URL at runtime, direct URL for migrations, same pattern as ../wia/packages/db).
- better-auth for admin sign-in (email + password, single `ADMIN` role for now).
- Resend for email, `pdf-lib` for certificates, `qrcode` for QR.
- Payments behind `src/lib/payments/provider.ts` interface: `initialize({amountKobo, email, reference, metadata, callbackUrl}) → {authorizationUrl}` and `verify(reference) → {status, amountKobo, paidAt, channel}`. Implement `paystack.ts` first (works in test mode). Add a `servicefabric.ts` adapter modeled on `../wia/apps/web/lib/servicefabric.ts` with the same interface. Also a `bank-transfer` pseudo-provider: shows masjid account + reference, admin confirms manually.
- Prayer: `adhan` npm. Bauchi coords 10.3158 N, 9.8442 E. Method Egyptian, madhab Shafi. Iqamah offsets per prayer from DB (`PrayerSettings`), defaults Fajr +25, Dhuhr +15, Asr +15, Maghrib +5, Isha +15 minutes. Jumu'ah times admin-set.
- Hijri: `Intl.DateTimeFormat` with `islamic-umalqura` calendar plus `PrayerSettings.hijriOffsetDays` (-1/0/+1) applied to the Gregorian date before formatting.
- Motion: GSAP 3 + `@gsap/react` `useGSAP`, ScrollTrigger, SplitText (free now). Lenis via `lenis/react` synced with `gsap.ticker`. Respect `prefers-reduced-motion` and `navigator.connection.saveData` (skip Lenis, heavy animations and video when set).
- i18n: not in phase 1. Write all UI strings through a tiny `t()` dictionary in `src/i18n/en.ts` so Hausa can be added without a rewrite. Arabic appears only as liturgical text (bismillah, prayer names) set in an Arabic font.
- Package manager pnpm. Lint with eslint, `pnpm typecheck` = `tsc --noEmit`.

## Design brief (the feel)
- **Posture**: premium through restraint. Think Museum of Islamic Art Doha, AlUla, Diriyah, Pillars app. NOT green-gold arabesque, NOT WordPress mosque theme, NOT gradient-glow SaaS.
- **Palette** (CSS variables in `globals.css`, light-first, dark supported): limestone `#F4EFE6` ground, warm ink `#1B1815` text, sand `#E4DAC8`, clay `#9C6B43`, one accent **deep Bauchi indigo** `#1F2A5A` used sparingly (links, countdown ring, accent rules), gold hairline `#B8974F` only for 1px rules and the certificate.
- **Type**: Latin display `Fraunces` (opsz, soft serif) for headlines, `Inter` for UI/body. Arabic `Amiri` for liturgical lines, `IBM Plex Sans Arabic` for any Arabic UI. Load via `next/font/google` with subsets `latin`, `latin-ext` (Hausa ɓ ɗ ƙ ƴ) and `arabic`. Arabic sits 12% larger optically. Headline scale is big and editorial: hero 7–9vw, tight leading, no more than 6 words per line.
- **Layout**: generous whitespace, 12-col grid, asymmetric compositions, full-bleed imagery bands alternating with narrow text measures. Section spacing 160–240px on desktop. No cards inside cards. No icon soup. Hairline rules instead of boxes.
- **Imagery**: we have no photos yet. Use tasteful abstract placeholders: CSS geometric muqarnas/8-point-star pattern rendered as low-contrast SVG, and a slow-drifting gradient of limestone→sand. Mark every placeholder with a `data-placeholder` attribute so they are easy to swap.
- **Motion**: type-led load sequence (SplitText lines rising with a soft mask), Lenis smooth scroll, pinned hero that yields to the prayer strip, parallax on imagery bands, section colour shift (limestone → deep indigo for the Minbar/tafsir teaser, back to limestone), magnetic hover on primary buttons, number tick-up on stats, subtle 8-point-star that rotates 1 degree per 100px scrolled. Motion on the shell only: **the prayer table, countdown digits and every form never animate beyond opacity.**
- **Prayer strip** (above the fold, server-rendered HTML): today Gregorian + Hijri, then five prayers as columns with Adhan / Iqamah rows, the next prayer highlighted, a countdown `HH:MM:SS` hydrated on the client, Jumu'ah times, qibla bearing (62° NE) with a small compass glyph, status line "Asr in 1h 12m".
- **Accessibility**: focus-visible rings, 4.5:1 contrast, reduced-motion path, semantic landmarks, skip link.
- **Performance**: ≤150 KB JS on the home route first paint (GSAP is fine, no Three.js in phase 1), fonts subset, images `next/image`, SSR everywhere, ISR for prayer JSON.

## Routes (phase 1)
- `/` home: hero, prayer strip, "The House" story teaser (3 blocks), Minbar teaser (tafsir library coming), services grid (Nikah live, others "soon"), giving teaser, footer with address, account details placeholder.
- `/prayer-times` full month timetable (SSR), downloadable as ICS later.
- `/nikah` landing: how it works (4 steps), fee, what to bring, CTA "Book a date".
- `/nikah/book` multi-step form.
- `/nikah/[bookingRef]` status page (public by ref + phone last 4 check).
- `/nikah/pay/[bookingRef]` payment handoff, and `/nikah/pay/callback` verification.
- `/verify/[certificateNo]` public certificate verification.
- `/donate` giving page: hero with the form as the hero (NZF pattern), purpose tabs Sadaqah / Zakat / Masjid Upkeep / Ramadan Iftar / Orphans Welfare, amount presets ₦1,000 / ₦5,000 / ₦20,000 / ₦100,000 + custom, "per day" reframing line for monthly, donor name/phone/email (anonymous toggle), frequency one-off or monthly (Paystack Plans), "cover the fees" toggle, pay button → Paystack. Below: manual bank transfer block (bank, account name, account number, a unique transfer reference the donor puts in the narration), campaign progress cards (admin-defined), transparency note. `/donate/thank-you/[reference]` receipt page with share-to-WhatsApp. Receipt email via Resend.
- `/admin/donations` list, filter, export CSV, manually confirm bank transfers, manage campaigns and account details.
- `/admin` (auth-gated): dashboard, `/admin/nikah` list + detail (confirm, mark solemnized, regenerate cert), `/admin/prayer` (iqamah offsets, jumu'ah, hijri offset), `/admin/sign-in`.
- `/api/webhooks/paystack` signature-verified webhook.
- `/api/prayer-times?date=` JSON.

## Nikah flow (the process we automate)
Real-world process: couple tells the masjid a date and time, comes on that day, the masjid verifies everything (wali, witnesses, sadaki, consent), solemnizes, and issues a certificate. Fee ₦10k–₦20k (admin-set, default ₦15,000).

Digital flow:
1. **Book**: form collects groom (name, phone, email, address, age), bride (name, phone, address, age), bride's wali (name, relationship, phone), two witnesses (name, phone), sadaki (amount, paid/deferred), preferred date + slot (slots admin-defined, default Sat/Sun 10:00, 11:00, 12:00, 16:00; also weekdays after Asr), notes. Zod-validated, multi-step with a review screen. Generates `bookingRef` like `NK-2026-0142`.
2. **Pay**: choose card/transfer/USSD via Paystack, or manual bank transfer (shows account + ref). On success booking → `PAID`. Email + status page confirm. Booking is `PENDING_PAYMENT` until then; unpaid bookings expire after 48h.
3. **Confirm**: admin reviews and sets `CONFIRMED` (or proposes new slot). Email sent.
4. **The day**: registrar opens the booking in admin, ticks the verification checklist (wali present + consent, two witnesses present, sadaki declared, both consents, IDs sighted), enters officiating imam name, then clicks **Solemnize**. Status → `SOLEMNIZED`.
5. **Certificate**: generated on solemnize. `certificateNo` like `GJM/NK/2026/0142`. PDF A4 landscape, limestone paper, gold hairline frame, bismillah in Amiri at top, masjid name in Fraunces, Arabic + English title, couple names, wali, witnesses, sadaki, date (Gregorian + Hijri), officiating imam, QR code to `/verify/[certificateNo]`, signature lines. Stored (bytes in Neon for now via `Certificate.pdf Bytes`, move to R2 later), emailed to both parties via Resend as attachment, downloadable from status page.
6. **Verify**: public page shows validity, names, date, imam. Nothing else.

Cancel/refund and reschedule: admin-only in phase 1.

## Data model (Prisma)
- `User`, `Session`, `Account`, `Verification` (better-auth), `User.role` enum `ADMIN | REGISTRAR`.
- `PrayerSettings` singleton: iqamah offsets (5 ints), `jumuahFirst`, `jumuahSecond` (strings "13:30"), `hijriOffsetDays`, `calculationMethod`, `updatedBy`.
- `NikahSlot` (weekday 0–6, time "10:00", capacity, active).
- `NikahBooking`: bookingRef unique, status enum `PENDING_PAYMENT | PAID | CONFIRMED | SOLEMNIZED | CANCELLED | EXPIRED`, scheduledAt, slot label, groom*, bride*, wali*, witness1*, witness2*, sadakiAmountKobo, sadakiStatus, notes, feeKobo, verification checklist JSON, officiantName, solemnizedAt, timestamps.
- `Payment`: bookingId, provider enum `PAYSTACK | SERVICEFABRIC | BANK_TRANSFER`, reference unique, amountKobo, status `INITIATED | SUCCESS | FAILED`, channel, raw JSON, paidAt.
- `Certificate`: bookingId unique, certificateNo unique, pdf Bytes, issuedAt, issuedById, revokedAt.
- `Donation`: reference unique, purpose enum `SADAQAH | ZAKAT | UPKEEP | IFTAR | ORPHANS | CAMPAIGN`, campaignId?, amountKobo, feesCoveredKobo, frequency `ONE_OFF | MONTHLY`, donorName?, donorEmail?, donorPhone?, anonymous, provider, providerRef, status `INITIATED | SUCCESS | FAILED | PENDING_TRANSFER`, channel, paystackPlanCode?, paystackSubscriptionCode?, paidAt, raw JSON.
- `Campaign`: slug, title, description, targetKobo, raisedKobo (denormalized, updated by webhook), active, coverImage?.
- `BankAccount` singleton-ish: bankName, accountName, accountNumber, active. Shown on donate and nikah transfer flows.
- `Announcement` (title, body, publishedAt) for the home page ticker later.

## Testing
- Unit: prayer-time engine (known Bauchi dates vs published timetable within 2 min), Hijri offset, bookingRef + certificateNo generators, nikah state machine transitions, Paystack webhook signature check, certificate PDF generates and contains the QR.
- Runner: `node --test` with `tsx` like wia (`pnpm test`).
- Manual: `pnpm dev`, book → pay (Paystack test card) → admin solemnize → email arrives → verify page.

## Payments (Paystack detail)
- Server-side `POST /transaction/initialize` with `amount` in kobo, `email`, `reference`, `callback_url`, `metadata { kind: 'nikah'|'donation', id, purpose }`, `channels: ['card','bank','ussd','bank_transfer','mobile_money']`. Redirect to `authorization_url`. Verify with `GET /transaction/verify/:reference` on callback AND trust only the webhook for final state.
- Webhook `/api/webhooks/paystack`: verify `x-paystack-signature` (HMAC SHA512 of raw body with secret), idempotent on reference, handle `charge.success`, `subscription.create`, `subscription.disable`, `invoice.payment_failed`.
- Monthly giving: create Plan (`interval: monthly`, amount) lazily per amount, initialize transaction with `plan`. Store subscription code, expose "manage subscription" link from Paystack.
- Fees: Paystack NG 1.5% + ₦100 (₦100 waived ≤ ₦2,500), cap ₦2,000. "Cover fees" adds the computed fee so the masjid nets the intended amount. Put the formula in `src/lib/payments/fees.ts` with tests.
- Env: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `NEXT_PUBLIC_APP_URL`. Works fully in test mode with test cards.

## Out of scope for phase 1
Hausa/Arabic locales, live streaming, tafsir archive, PWA/push, WhatsApp, native app, Three.js.
