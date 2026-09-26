import type { ReactNode } from "react";
import { t } from "@/i18n/en";

/**
 * Shared shell for nikah emails. Inline styles only (email clients), table
 * layout, limestone paper, one indigo button. Rendered by sendEmail().
 */
const INK = "#1B1815";
const SOFT = "#5A5249";
const LIME = "#F4EFE6";
const GOLD = "#B8974F";
const INDIGO = "#1F2A5A";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export function EmailLayout({ preview, heading, children }: { preview: string; heading: string; children: ReactNode }) {
  const e = t.nikah.email;
  return (
    <html lang="en">
      {/* Email document, not a Next page: a plain <head> is correct here. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>{heading}</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: LIME, color: INK, fontFamily: SANS }}>
        <div style={{ display: "none", maxHeight: 0, overflow: "hidden" }}>{preview}</div>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ background: LIME }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 560 }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingBottom: 20, borderBottom: `1px solid ${GOLD}` }}>
                        <p style={{ margin: 0, fontFamily: SERIF, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase", color: SOFT }}>
                          {t.site.name}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "32px 0 8px" }}>
                        <p style={{ margin: 0, fontSize: 15, color: SOFT }}>
                          {e.salutation} · <span lang="ar" dir="rtl">{e.salutationArabic}</span>
                        </p>
                        <h1 style={{ margin: "16px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: 28, lineHeight: 1.2, color: INK }}>
                          {heading}
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontSize: 15, lineHeight: 1.6, color: INK }}>{children}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingTop: 32, fontSize: 14, lineHeight: 1.6, color: SOFT }}>
                        <p style={{ margin: 0 }}>{e.signoff}</p>
                        <p style={{ margin: 0 }}>{e.team}</p>
                      </td>
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

export function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: "16px 0 0" }}>{children}</p>;
}

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 24, borderTop: "1px solid rgba(27,24,21,0.12)" }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: "10px 12px 10px 0", fontSize: 13, color: SOFT, borderBottom: "1px solid rgba(27,24,21,0.12)", width: "38%", verticalAlign: "top" }}>
              {k}
            </td>
            <td style={{ padding: "10px 0", fontSize: 15, color: INK, borderBottom: "1px solid rgba(27,24,21,0.12)" }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CTA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p style={{ margin: "28px 0 0" }}>
      <a
        href={href}
        style={{
          display: "inline-block",
          background: INDIGO,
          color: LIME,
          textDecoration: "none",
          padding: "13px 24px",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 500,
        }}
      >
        {children}
      </a>
    </p>
  );
}

export function SmallLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p style={{ margin: "16px 0 0", fontSize: 13 }}>
      <a href={href} style={{ color: INDIGO }}>
        {children}
      </a>
    </p>
  );
}
