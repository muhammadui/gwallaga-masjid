import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { ArabicShaper } from "arabic-persian-reshaper";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import { nikah as dict } from "@/i18n/nikah.en";
import type { NikahBooking } from "@/lib/db";
import { formatNaira } from "@/lib/utils";
import { sadakiDisplay } from "./journal";
import { formatLagosDate } from "./time";

/**
 * Nikah certificate, A4 landscape, drawn with pdf-lib.
 *
 * Fonts are committed under src/assets/fonts (OFL, licences alongside):
 * Fraunces 72pt Soft (display + italic names), Fraunces 9pt (body) and Amiri
 * (Arabic). pdf-lib does not apply OpenType joining for Arabic, so Arabic
 * strings are pre-shaped to Presentation Forms-B with arabic-persian-reshaper;
 * fontkit's layout then lays the run out right-to-left. Amiri is embedded
 * without subsetting (subsetting drops the presentation-form glyph mapping).
 */

export type CertificateBooking = Pick<
  NikahBooking,
  | "groomName"
  | "brideName"
  | "waliName"
  | "waliRelationship"
  | "witness1Name"
  | "witness2Name"
  | "sadakiAmountKobo"
  | "sadakiStatus"
  | "checklist"
  | "scheduledAt"
  | "solemnizedAt"
>;

export interface CertificateOptions {
  certificateNo: string;
  issuedAt: Date;
  officiantName: string;
  /** e.g. "20 Rabiʻ II 1448 AH" (see hijri-string.ts). */
  hijriDate: string;
  /** Absolute URL of the public verify page (URL-safe certificate slug). */
  verifyUrl: string;
  masjidName?: string;
  city?: string;
}

const W = 841.89;
const H = 595.28;

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const C = {
  ground: hex("#F4EFE6"),
  ink: hex("#1B1815"),
  soft: hex("#5A5249"),
  clay: hex("#9C6B43"),
  gold: hex("#B8974F"),
};

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");
let fontCache: Promise<Record<"display" | "italic" | "body" | "arabic", Uint8Array>> | null = null;

function loadFonts() {
  fontCache ??= Promise.all(
    ["Fraunces72ptSoft-Regular.ttf", "Fraunces72ptSoft-Italic.ttf", "Fraunces9pt-Regular.ttf", "Amiri-Regular.ttf"].map((f) =>
      readFile(path.join(FONT_DIR, f)),
    ),
  ).then(([display, italic, body, arabic]) => ({ display, italic, body, arabic }));
  return fontCache;
}

/** Pre-shape Arabic for pdf-lib (see module note). */
export function shapeArabic(text: string): string {
  return ArabicShaper.convertArabic(text);
}

// Fraunces has no Hausa hooked letters; fall back to their plain Latin bases.
const FALLBACKS: Record<string, string> = {
  Ɓ: "B", ɓ: "b", Ɗ: "D", ɗ: "d", Ƙ: "K", ƙ: "k", Ƴ: "Y", ƴ: "y",
  "₦": "NGN ", "ʻ": "'", "ʼ": "'", "’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-" };

/** Replace characters the font cannot draw (fallback map, then diacritic stripping). */
function fit(font: PDFFont, text: string): string {
  const supported = new Set(font.getCharacterSet());
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (supported.has(cp) || ch === " ") {
      out += ch;
      continue;
    }
    if (FALLBACKS[ch] !== undefined) {
      out += [...FALLBACKS[ch]].every((c) => supported.has(c.codePointAt(0)!) || c === " ") ? FALLBACKS[ch] : "";
      continue;
    }
    const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    out += base && [...base].every((c) => supported.has(c.codePointAt(0)!)) ? base : "?";
  }
  return out;
}

interface TextOpts {
  font: PDFFont;
  size: number;
  color?: RGB;
  tracking?: number;
}

function widthOf(text: string, { font, size, tracking = 0 }: TextOpts): number {
  return font.widthOfTextAtSize(text, size) + tracking * Math.max(0, [...text].length - 1);
}

function drawAt(page: PDFPage, text: string, x: number, y: number, o: TextOpts) {
  const color = o.color ?? C.ink;
  if (!o.tracking) {
    page.drawText(text, { x, y, size: o.size, font: o.font, color });
    return;
  }
  let cx = x;
  for (const ch of text) {
    page.drawText(ch, { x: cx, y, size: o.size, font: o.font, color });
    cx += o.font.widthOfTextAtSize(ch, o.size) + o.tracking;
  }
}

function drawCentered(page: PDFPage, text: string, cx: number, y: number, o: TextOpts) {
  drawAt(page, text, cx - widthOf(text, o) / 2, y, o);
}

/** Shrink `size` until the text fits `maxWidth`. */
function fitSize(text: string, o: TextOpts, maxWidth: number, min = 8): number {
  let size = o.size;
  while (size > min && widthOf(text, { ...o, size }) > maxWidth) size -= 0.5;
  return size;
}

function wrap(text: string, o: TextOpts, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && widthOf(next, o) > maxWidth) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Regular polygon/star path centred on the origin (SVG y-down; symmetric so flip-safe). */
function polygonPath(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") + " Z";
}

function squarePath(r: number, rotationDeg: number): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const a = ((rotationDeg + 45 + i * 90) * Math.PI) / 180;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return polygonPath(pts);
}

function starPath(outer: number, inner: number, points = 8): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return polygonPath(pts);
}

/** Khatam (two interlaced squares) with a small filled star at its heart. */
function drawKhatam(page: PDFPage, x: number, y: number, r: number, width = 0.6, opacity = 1) {
  page.drawSvgPath(squarePath(r, 0), { x, y, borderColor: C.gold, borderWidth: width, borderOpacity: opacity });
  page.drawSvgPath(squarePath(r, 45), { x, y, borderColor: C.gold, borderWidth: width, borderOpacity: opacity });
  page.drawSvgPath(starPath(r * 0.42, r * 0.2), { x, y, color: C.gold, opacity });
}

function drawDiamond(page: PDFPage, x: number, y: number, r: number) {
  page.drawSvgPath(polygonPath([[0, -r], [r * 0.7, 0], [0, r], [-r * 0.7, 0]]), { x, y, color: C.gold });
}

function drawFrame(page: PDFPage) {
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.ground });

  const outer = 22;
  const inner = 29;
  page.drawRectangle({ x: outer, y: outer, width: W - outer * 2, height: H - outer * 2, borderColor: C.gold, borderWidth: 1 });
  page.drawRectangle({ x: inner, y: inner, width: W - inner * 2, height: H - inner * 2, borderColor: C.gold, borderWidth: 0.4 });

  // Corner ornaments sit on the inner frame's corners, with a quarter-step
  // bracket inside each corner.
  const corners: [number, number, number, number][] = [
    [inner, inner, 1, 1],
    [W - inner, inner, -1, 1],
    [inner, H - inner, 1, -1],
    [W - inner, H - inner, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    page.drawRectangle({ x: x - 9, y: y - 9, width: 18, height: 18, color: C.ground });
    drawKhatam(page, x, y, 8.5, 0.7);
    const b = 30;
    const g = 14;
    page.drawLine({ start: { x: x + sx * g, y: y + sy * (g + b) }, end: { x: x + sx * g, y: y + sy * g }, thickness: 0.4, color: C.gold });
    page.drawLine({ start: { x: x + sx * g, y: y + sy * g }, end: { x: x + sx * (g + b), y: y + sy * g }, thickness: 0.4, color: C.gold });
  }

  // Midpoint diamonds on each side of the frame band.
  const mid = (outer + inner) / 2;
  for (const [x, y] of [
    [W / 2, mid],
    [W / 2, H - mid],
    [mid, H / 2],
    [W - mid, H / 2],
  ] as const) {
    page.drawRectangle({ x: x - 5, y: y - 5, width: 10, height: 10, color: C.ground });
    drawDiamond(page, x, y, 4);
  }

  // Faint rosette behind the names.
  drawKhatam(page, W / 2, 322, 150, 0.5, 0.13);
  page.drawCircle({ x: W / 2, y: 322, size: 150, borderColor: C.gold, borderWidth: 0.4, borderOpacity: 0.1 });
}

function ruleWithDiamond(page: PDFPage, cx: number, y: number, half: number) {
  page.drawLine({ start: { x: cx - half, y }, end: { x: cx - 8, y }, thickness: 0.5, color: C.gold });
  page.drawLine({ start: { x: cx + 8, y }, end: { x: cx + half, y }, thickness: 0.5, color: C.gold });
  drawDiamond(page, cx, y, 3.2);
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
}

export async function generateNikahCertificate(booking: CertificateBooking, opts: CertificateOptions): Promise<Uint8Array> {
  const c = dict.certificate;
  const masjid = opts.masjidName ?? "Gwallaga Juma'at Masjid";
  const city = opts.city ?? "Bauchi";
  const nikahDate = booking.solemnizedAt ?? booking.scheduledAt;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${c.title} ${opts.certificateNo}`);
  doc.setAuthor(masjid);
  doc.setSubject(`${booking.groomName} & ${booking.brideName}`);
  doc.setCreator(masjid);
  doc.setProducer(masjid);
  doc.setCreationDate(opts.issuedAt);

  const bytes = await loadFonts();
  const display = await doc.embedFont(bytes.display, { subset: true });
  const italic = await doc.embedFont(bytes.italic, { subset: true });
  const body = await doc.embedFont(bytes.body, { subset: true });
  const arabic = await doc.embedFont(bytes.arabic, { subset: false });

  const page = doc.addPage([W, H]);
  drawFrame(page);
  const cx = W / 2;

  // Top corners: certificate number and issue date.
  const small: TextOpts = { font: body, size: 7.5, color: C.soft, tracking: 1.1 };
  drawAt(page, fit(body, `${c.number.toUpperCase()} ${opts.certificateNo}`), 62, H - 62, small);
  const issued = fit(body, `${c.issued} ${formatLagosDate(opts.issuedAt)}`.toUpperCase());
  drawAt(page, issued, W - 62 - widthOf(issued, small), H - 62, small);

  // Bismillah and masjid name.
  drawCentered(page, shapeArabic(c.bismillah), cx, H - 77, { font: arabic, size: 23, color: C.ink });
  drawCentered(page, fit(display, `${masjid} · ${city}`.toUpperCase()), cx, H - 107, {
    font: display,
    size: 9.5,
    color: C.clay,
    tracking: 2.4,
  });
  ruleWithDiamond(page, cx, H - 119, 70);

  // Title.
  drawCentered(page, c.title, cx, H - 156, { font: display, size: 38, color: C.ink });
  drawCentered(page, shapeArabic(c.titleArabic), cx, H - 184, { font: arabic, size: 17, color: C.clay });

  // Statement and names.
  drawCentered(page, c.certify, cx, H - 218, { font: body, size: 11, color: C.soft });
  const groom = fit(italic, booking.groomName);
  const bride = fit(italic, booking.brideName);
  const nameSize = Math.min(fitSize(groom, { font: italic, size: 31 }, 600), fitSize(bride, { font: italic, size: 31 }, 600));
  drawCentered(page, groom, cx, H - 256, { font: italic, size: nameSize, color: C.ink });
  drawCentered(page, c.and, cx, H - 278, { font: italic, size: 12, color: C.clay });
  drawCentered(page, bride, cx, H - 310, { font: italic, size: nameSize, color: C.ink });

  const para = fit(
    body,
    fill(c.solemnized, { masjid, city, date: formatLagosDate(nikahDate), hijri: opts.hijriDate }),
  );
  const paraOpts: TextOpts = { font: body, size: 10.5, color: C.soft };
  wrap(para, paraOpts, 560)
    .slice(0, 3)
    .forEach((line, i) => drawCentered(page, line, cx, H - 338 - i * 15, paraOpts));

  // Details row.
  const sadakiStatus = dict.sadakiStatus[sadakiDisplay(booking)];
  const columns: { label: string; lines: string[] }[] = [
    { label: c.wali, lines: [booking.waliName, booking.waliRelationship] },
    { label: c.witnesses, lines: [booking.witness1Name, booking.witness2Name] },
    { label: c.sadaki, lines: [formatNaira(booking.sadakiAmountKobo), sadakiStatus] },
    { label: c.officiant, lines: [opts.officiantName] },
  ];
  const left = 92;
  const colW = (W - left * 2) / columns.length;
  columns.forEach((col, i) => {
    const x = left + colW * i + colW / 2;
    drawCentered(page, col.label.toUpperCase(), x, 206, { font: body, size: 7, color: C.clay, tracking: 1.6 });
    col.lines.forEach((raw, j) => {
      const text = fit(body, raw);
      const o: TextOpts = { font: body, size: 10.5, color: C.ink };
      drawCentered(page, text, x, 190 - j * 14, { ...o, size: fitSize(text, o, colW - 16) });
    });
  });

  // Signature lines.
  const sig = (x1: number, x2: number, label: string, above?: string) => {
    page.drawLine({ start: { x: x1, y: 104 }, end: { x: x2, y: 104 }, thickness: 0.5, color: C.ink, opacity: 0.55 });
    if (above) {
      const t = fit(italic, above);
      const o: TextOpts = { font: italic, size: 12, color: C.ink };
      drawCentered(page, t, (x1 + x2) / 2, 111, { ...o, size: fitSize(t, o, x2 - x1) });
    }
    drawCentered(page, label.toUpperCase(), (x1 + x2) / 2, 92, { font: body, size: 7, color: C.soft, tracking: 1.6 });
  };
  sig(96, 276, c.imam, opts.officiantName);
  sig(316, 496, c.registrar);

  // QR code to the verify page.
  const qr = await QRCode.toBuffer(opts.verifyUrl, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 0,
    width: 360,
    color: { dark: "#1B1815", light: "#F4EFE6" },
  });
  const qrImage = await doc.embedPng(qr);
  const qrSize = 68;
  const qrX = W - 78 - qrSize;
  page.drawImage(qrImage, { x: qrX, y: 88, width: qrSize, height: qrSize });
  drawCentered(page, c.scan.toUpperCase(), qrX + qrSize / 2, 78, { font: body, size: 6.5, color: C.soft, tracking: 1.4 });

  // Footer.
  const pretty = opts.verifyUrl.replace(/^https?:\/\//, "");
  const footer = fit(body, fill(c.verifyAt, { url: pretty }));
  const fo: TextOpts = { font: body, size: 7.5, color: C.soft, tracking: 0.4 };
  drawCentered(page, footer, cx, 44, { ...fo, size: fitSize(footer, fo, 520, 6) });

  return doc.save({ useObjectStreams: false });
}
