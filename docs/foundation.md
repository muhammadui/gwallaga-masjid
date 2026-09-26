# Foundation: what exists and how to use it

Read with `docs/superpowers/specs/2026-09-26-phase-1-design.md`. Next 16: read `node_modules/next/dist/docs/` before writing Next code (`params`/`searchParams` are Promises; `PageProps<'/route'>` / `LayoutProps` are global; run `pnpm typecheck`, which runs `next typegen` first).

## Scripts
| | |
|---|---|
| `pnpm dev` / `build` / `start` | Next (build runs `prisma generate`) |
| `pnpm typecheck` | `next typegen && tsc --noEmit` |
| `pnpm lint` | eslint |
| `pnpm test` | `node --import tsx --test "src/**/*.test.ts"` |
| `pnpm db:migrate` / `db:deploy` / `db:push` / `db:generate` / `db:seed` | Prisma 7.10 |

## Database: `@/lib/db`
```ts
import { prisma, Prisma, NikahStatus, DonationPurpose /* …enums */ } from "@/lib/db";
import type { NikahBooking, Donation } from "@/lib/db"; // all model types
```
- Pooled `DATABASE_URL` at runtime (pg adapter); `prisma.config.ts` strips `-pooler` (or uses `DIRECT_URL`) and adds `connect_timeout=30` for Neon cold starts.
- Money is **kobo** (`Int`). Times of day are `"HH:mm"` in Africa/Lagos.
- Singletons use `id = "default"`: `SiteSettings` (masjidName, address, phone, whatsapp, email, `nikahFeeKobo` = 1,500,000), `PrayerSettings` (5 iqamah offsets, `jumuahFirst`/`jumuahSecond`, `hijriOffsetDays`, `calculationMethod`).
- `NikahSlot.weekday` is 0 = Sunday … 6 = Saturday; unique on (weekday, time).
- `NikahBooking` has `expiresAt` (set 48h for unpaid), `checklist Json`, `slotId?` + `slotLabel`.
- `Donation.amountKobo` = what the masjid nets; `feesCoveredKobo` = extra charged. Monthly: `paystackPlanCode`, `paystackSubscriptionCode`, `paystackEmailToken`, `subscriptionActive`.
- `Campaign.raisedKobo` is maintained by the webhook (increments by `amountKobo`). `Campaign.purpose` links a campaign to a donate tab.
- `PaystackPlan` caches one plan per (amountKobo, interval).

Settings readers (React `cache()`d, fall back to defaults if unseeded): `getSiteSettings()`, `getPrayerSettings()`, `getBankAccount()` from `@/lib/settings` (also `DEFAULT_SITE_SETTINGS`, `DEFAULT_PRAYER_SETTINGS`). After mutating them call `revalidatePath("/", "layout")` (the public shell has `revalidate = 300`).

Seed (`pnpm db:seed`, idempotent): admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (role ADMIN), settings, 12 nikah slots, BankAccount from `MASJID_BANK_NAME`/`MASJID_ACCOUNT_NAME`/`MASJID_ACCOUNT_NUMBER`, campaigns `masjid-upkeep`, `ramadan-iftar-1448`, `orphans-welfare-fund`.

## Auth
- `@/lib/auth/server`: `auth` (better-auth, email+password, **sign-up disabled**, `role` additional field, `nextCookies()`), types `AuthSession`, `AuthUser`.
- `@/lib/auth/client`: `authClient`, `signIn`, `signOut`, `useSession` (client components).
- `@/lib/auth/require-admin`: `requireAdmin(roles?)` → session or redirect to `/admin/sign-in`; `getSession()`.
  ```ts
  const { user } = await requireAdmin();          // ADMIN or REGISTRAR
  await requireAdmin(["ADMIN"]);                 // admins only
  ```
  Call it in every admin page **and** every admin server action (layouts don't guard actions).
- `@/actions/auth`: `signOutAction` (form action).
- Admin shell: `src/app/admin/(panel)/layout.tsx` (gated; add pages under `(panel)/nikah`, `(panel)/donations`, `(panel)/prayer`). Sign-in lives in `admin/(auth)/sign-in`.

## Payments: `@/lib/payments`
```ts
import { getProvider, paystack, createPlan, makeReference, grossUpForFees, paystackFeeKobo } from "@/lib/payments";

const reference = makeReference("NK");             // GJM-NK-MFZ3K2QX-7HQD  ("DN" donations, "BT" transfers)
const provider = getProvider();                    // PAYMENT_PROVIDER=paystack|servicefabric
const { authorizationUrl, providerRef } = await provider.initialize({
  amountKobo, email, reference,
  callbackUrl: absoluteUrl(`/nikah/pay/callback`),
  metadata: { kind: "nikah", id: booking.id, purpose: "nikah" },
  plan: await createPlan(amountKobo),            // monthly giving only (Paystack)
});
// store provider.id ("PAYSTACK" | "SERVICEFABRIC") as the PaymentProvider enum
const v = await provider.verify(reference);        // { status: "success"|"failed"|"pending", amountKobo, channel, paidAt, raw }
```
- Always create the `Payment`/`Donation` row (status INITIATED, `reference`) **before** redirecting; the webhook settles by reference.
- `metadata.kind` must be `"nikah"` or `"donation"`. For nikah the webhook looks up `Payment.reference`; for donations `Donation.reference`.
- Fees: `paystackFeeKobo(charge)`, `grossUpForFees(net)` (amount to charge so the masjid nets `net`), `feesToCoverKobo(net)`, `netAfterFeesKobo(charge)`.
- Errors: `PaymentConfigError` (missing env, show "payments unavailable"), `PaymentGatewayError` (status, body).
- `getSubscriptionManageLink(subscriptionCode)` for "manage subscription".
- Webhook `POST /api/webhooks/paystack`: raw-body HMAC-SHA512 check (401 if bad), then `handlePaystackEvent(event)` from `@/lib/payments/webhook`:
  - `charge.success` → Payment SUCCESS + booking `PENDING_PAYMENT|EXPIRED → PAID`, or Donation SUCCESS + campaign increment; underpayment → FAILED; renewals (unknown reference + plan + email) create a child Donation.
  - `subscription.create` → attaches subscription code/email token to the latest matching monthly Donation; `subscription.disable|not_renew` → `subscriptionActive=false`; `invoice.payment_failed` logged.
  - Idempotent (conditional updates in a transaction). Returns 200 for handled/ignored, 500 only on infrastructure errors so Paystack retries.
- Bank transfer is not a gateway: create the row with `provider: "BANK_TRANSFER"`, status `PENDING_TRANSFER` (donation) / `INITIATED` (payment), show `getBankAccount()` + the reference; admin confirms.
- ServiceFabric adapter compiles and throws `PaymentConfigError` naming the missing `SERVICEFABRIC_*` vars; no recurring plans.

## Email: `@/lib/email`
```ts
await sendEmail({ to, subject, react: <Receipt …/> });              // or html: "<p>…</p>"
await sendEmail({ to: [groom, bride], subject, html, attachments: [{ filename: "certificate.pdf", content: pdfBytes, contentType: "application/pdf" }] });
```
Returns `{ ok: true, id, mode: "resend" | "dev" } | { ok: false, error }` (never throws). Without `RESEND_API_KEY` it logs a summary and writes `.dev-mail/<timestamp>-<subject>.html` (+ attachments). Sender from `EMAIL_FROM`.

## Validation
Zod schemas in `src/lib/validation/` (`auth.ts` has `signInSchema`). Server actions in `src/actions/` with `"use server"`.

## i18n
`import { t } from "@/i18n/en"`: `t.site`, `t.nav`, `t.buttons`, `t.footer`, `t.admin`, `t.status[NikahStatus]`, `t.a11y`, `t.forms`. Add keys there; no hard-coded UI strings. Type: `Dictionary`.

## Design system
Tokens in `src/app/globals.css`.
- Palette utilities: `bg-limestone`, `bg-limestone-deep`, `text-ink`, `text-ink-soft`, `bg-sand`, `text-clay`, `bg-indigo`, `text-gold`.
- Semantic (follow Section tone / dark): `bg-ground`, `text-fg`, `text-muted`, `bg-surface`, `border-line`/`ring-line`, `ring-line-strong`, `bg-accent`, `text-accent-fg`, `text-danger`. Raw vars: `--fg`, `--fg-muted`, `--hairline-gold`, `--ring`.
- Type: `text-display-hero|xl|lg|md|sm` (clamp, tight leading), `text-lede`, `text-eyebrow`; fonts `font-display` (Fraunces), `font-sans` (Inter), `font-arabic` (Amiri), `font-arabic-ui` (IBM Plex Sans Arabic).
- Spacing: `--section-y` (`py-(--section-y)`), `--gutter` (`gutter-x`), `measure`.
- Hairlines: `hairline-t|b|y|l`, `hairline-gold`. Easing: `ease-[var(--ease-spring)]`, `--ease-out-expo`, `--ease-soft`. Z layers: `--z-header` 40, `--z-overlay` 50, `--z-toast` 60, `--z-grain` 70.
- Placeholders: `.placeholder-drift` (limestone→sand drift). Always add `data-placeholder`.
- Dark scheme: `data-theme="dark"` on `<html>` (opt-in; `dark:` variant targets it).

Components (`@/components/ui/*`, all server-safe unless noted):
| Component | Notes |
|---|---|
| `Button` | `variant` primary/secondary/ghost, `size` sm/md/lg, `asChild` (wrap `<Link>`), `icon` (`true` = ↗ in its own circle, or a node), `magnetic`. `buttonVariants` for custom elements. |
| `Magnetic` (client) | magnetic hover wrapper; off for reduced motion / touch |
| `Input`, `Textarea`, `Select` (`options`, `placeholder`), `Label` (`required`) | never animate beyond colour |
| `Field` | `name`, `label`, `error`, `hint`, `required`; injects id/aria into its single child control |
| `Container` | `size` narrow/default/wide/full, `as` |
| `Section` | `tone` limestone/indigo/sand, `spacing` default/tight/none, `as` |
| `Eyebrow` | `index` ("01"), `bare` |
| `Heading` | `as` h1–h4/p, `size` hero/xl/lg/md/sm; `<em>` = soft italic |
| `ArabicLine` | `variant` liturgical (Amiri) / ui; `lang="ar" dir="rtl"`, 112% |
| `StarPattern` | girih texture, `size`, `opacity`, `strokeWidth`; uses `currentColor`; `data-placeholder` |
| `Divider` | gold hairline, `ornament`, `tone` gold/line |

Site shell (`@/components/site/*`): `Header` (client; `nextPrayerSlot?: ReactNode` fills the "Next: …" pill, `solidAfter`), `Footer` (async server; settings + bank account + Hijri year), `Wordmark`, `NAV_LINKS`. `src/app/(site)/layout.tsx` wraps public pages; content goes in `<main id="main">`. `SmoothScroll` (`@/components/providers/smooth-scroll`) is mounted in the root layout; it exports `prefersLowMotion()` for your own motion guards. GSAP plugins: register what you use (`gsap.registerPlugin(ScrollTrigger, SplitText)`); ScrollTrigger is already synced with Lenis.

Utilities (`@/lib/utils`): `cn()`, `formatNaira(kobo, { decimals? })`, `absoluteUrl(path)`.

## Environment
| Var | Use |
|---|---|
| `DATABASE_URL` | Neon pooled URL (runtime); `DIRECT_URL` optional override for migrations |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | auth |
| `NEXT_PUBLIC_APP_URL` | absolute URLs, callbacks, trusted origin |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed |
| `PAYMENT_PROVIDER` | `paystack` (default) or `servicefabric` |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` | Paystack (test keys work) |
| `SERVICEFABRIC_BASE_URL`, `_PAYLINK_URL`, `_APP_ID`, `_APP_KEY`, `_WEBHOOK_SECRET`, `_FEE_BEARER` | ServiceFabric |
| `RESEND_API_KEY`, `EMAIL_FROM` | email (blank key = dev mailer) |
| `MASJID_BANK_NAME`, `MASJID_ACCOUNT_NAME`, `MASJID_ACCOUNT_NUMBER`, `MASJID_PHONE`, `MASJID_WHATSAPP` | seed |
