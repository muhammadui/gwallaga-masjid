import { ImageResponse } from "next/og";
import { t } from "@/i18n/en";

export const alt = `${t.site.name} · ${t.home.metaTitle}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card for the public site: limestone ground, girih rule, indigo accent. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f4efe6",
          color: "#1b1815",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 26, color: "#4a433b" }}>
          <div style={{ width: 56, height: 1, background: "#b8974f" }} />
          {t.site.name} · {t.site.city}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, lineHeight: 1, letterSpacing: -3 }}>
          <span>{t.home.heroLine1}</span>
          <span>{t.home.heroLine2}</span>
          <span>
            {t.home.heroLine3Pre} {t.home.heroLine3Em}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, color: "#1f2a5a" }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, background: "#1f2a5a" }} />
          {t.prayer.title} · {t.nav.nikah} · {t.nav.donate}
        </div>
      </div>
    ),
    size,
  );
}
