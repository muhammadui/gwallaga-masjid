import { t } from "@/i18n/en";

/**
 * Donation receipt email. Table layout + inline styles for mail clients;
 * limestone ground, ink text, one gold hairline. No donor email is printed.
 */

export interface DonationReceiptProps {
  greetingName?: string;
  amount: string;
  feesCovered?: string;
  purpose: string;
  date: string;
  reference: string;
  method: string;
  monthly: boolean;
  receiptUrl: string;
}

const C = {
  ground: "#F4EFE6",
  panel: "#FBF8F2",
  ink: "#1B1815",
  muted: "#6E665C",
  gold: "#B8974F",
  indigo: "#1F2A5A",
  line: "#E4DAC8",
};

const serif = "Georgia, 'Times New Roman', serif";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "12px 0", borderTop: `1px solid ${C.line}`, color: C.muted, fontSize: 13, fontFamily: sans }}>{label}</td>
      <td
        style={{
          padding: "12px 0",
          borderTop: `1px solid ${C.line}`,
          color: C.ink,
          fontSize: 14,
          fontFamily: sans,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </td>
    </tr>
  );
}

export function DonationReceiptEmail(p: DonationReceiptProps) {
  const d = t.donate;
  return (
    <html lang="en">
      {/* eslint-disable-next-line @next/next/no-head-element -- email HTML, not a Next page */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{d.email.subject(p.amount)}</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: C.ground }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ background: C.ground }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 520 }}>
                  <tbody>
                    <tr>
                      <td style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, paddingBottom: 18 }}>
                        {t.site.name}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ background: C.panel, borderTop: `1px solid ${C.gold}`, padding: "36px 32px", borderRadius: 4 }}>
                        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30, lineHeight: 1.15, color: C.ink }}>
                          {d.email.heading}
                          {p.greetingName ? `, ${p.greetingName}` : ""}.
                        </h1>
                        <p style={{ margin: "14px 0 0", fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: C.ink }}>{d.email.intro}</p>
                        <p style={{ margin: "28px 0 4px", fontFamily: serif, fontSize: 40, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{p.amount}</p>
                        <p style={{ margin: "0 0 24px", fontFamily: sans, fontSize: 13, color: C.muted }}>
                          {p.purpose}
                          {p.monthly ? ` · ${d.thankYou.monthly}` : ""}
                        </p>
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <Row label={d.thankYou.date} value={p.date} />
                            <Row label={d.thankYou.reference} value={p.reference} />
                            <Row label={d.thankYou.method} value={p.method} />
                            {p.feesCovered ? <Row label={d.thankYou.feesCovered} value={p.feesCovered} /> : null}
                            <Row label={d.thankYou.frequency} value={p.monthly ? d.thankYou.monthly : d.thankYou.oneOff} />
                          </tbody>
                        </table>
                        {p.monthly ? (
                          <p style={{ margin: "20px 0 0", fontFamily: sans, fontSize: 13, lineHeight: 1.6, color: C.muted }}>{d.email.monthlyNote}</p>
                        ) : null}
                        <p style={{ margin: "28px 0 0", fontFamily: serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.6, color: C.ink }}>
                          {d.thankYou.dua}
                        </p>
                        <p style={{ margin: "28px 0 0" }}>
                          <a
                            href={p.receiptUrl}
                            style={{
                              display: "inline-block",
                              background: C.indigo,
                              color: C.ground,
                              fontFamily: sans,
                              fontSize: 14,
                              textDecoration: "none",
                              padding: "12px 22px",
                              borderRadius: 999,
                            }}
                          >
                            {d.thankYou.eyebrow}
                          </a>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontFamily: sans, fontSize: 12, color: C.muted, paddingTop: 18, lineHeight: 1.6 }}>{d.email.footer}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function ManageSubscriptionEmail({ link }: { link: string }) {
  const d = t.donate.email;
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: "40px 16px", background: C.ground, fontFamily: sans, color: C.ink }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 520, margin: "0 auto" }}>
          <tbody>
            <tr>
              <td style={{ background: C.panel, borderTop: `1px solid ${C.gold}`, padding: "32px" }}>
                <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 26 }}>{d.manageSubject}</h1>
                <p style={{ fontSize: 15, lineHeight: 1.6 }}>{d.manageBody}</p>
                <p>
                  <a href={link} style={{ display: "inline-block", background: C.indigo, color: C.ground, textDecoration: "none", padding: "12px 22px", borderRadius: 999, fontSize: 14 }}>
                    {d.manageCta}
                  </a>
                </p>
                <p style={{ fontSize: 12, color: C.muted }}>{d.footer}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
