/**
 * Brand glyph pipeline: shapes an Arabic string with a font and emits the
 * outlines as SVG, one <path> per glyph, plus a TSX module the site imports.
 *
 * Shaping (the font's GSUB/GPOS: joining forms, ligatures, mark positioning)
 * is done by HarfBuzz (harfbuzzjs), the same engine browsers use. fontkit's
 * own layout() is available via --shaper fontkit but misplaces stacked
 * harakat in Amiri (fatha over shadda collides), so it is not the default.
 * Glyph outlines always come from fontkit (glyph.path), by glyph id.
 *
 *   pnpm wordmark --font <font> --text "مسجد غوالاغا الجامع" --out src/assets/brand/wordmark.svg
 *     -> wordmark.svg (fill), wordmark-stroke.svg (stroke, for draw-in), wordmark.tsx
 *
 *   pnpm brand --font <font>
 *     -> regenerates every brand asset (wordmark, bismillah, favicon) in one go.
 *
 * Options: --icon <file.svg>   also write a square favicon (ink on limestone)
 *          --no-tsx            skip the TSX module
 *          --shaper harfbuzz|fontkit   (default harfbuzz)
 *          --preview <dir>     write an HTML page comparing the SVG with the
 *                              same text rendered by the browser via @font-face
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import * as fontkit from "fontkit";

const INK = "#1B1815";
const LIMESTONE = "#F4EFE6";

export const BRAND_TARGETS = [
  { name: "wordmark", text: "مسجد غوالاغا الجامع", out: "src/assets/brand/wordmark.svg" },
  {
    name: "bismillah",
    text: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ",
    out: "src/assets/brand/bismillah.svg",
  },
  // Favicon only: no SVG/TSX pair, just src/app/icon.svg.
  { name: "icon", text: "غوالاغا", out: null, icon: "src/app/icon.svg" },
] as const;

interface Shaped {
  paths: string[];
  viewBox: [number, number, number, number];
  unitsPerEm: number;
  glyphCount: number;
  fontName: string;
}

const round = (d: string) => d.replace(/-?\d*\.\d+(?:e-?\d+)?/g, (n) => String(Math.round(Number(n) * 10) / 10));

function openFont(fontPath: string): fontkit.Font {
  const f = fontkit.openSync(fontPath) as fontkit.Font | fontkit.FontCollection;
  if ("fonts" in f) return f.fonts[0];
  return f;
}

type Shaper = "harfbuzz" | "fontkit";
interface Placed {
  gid: number;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
}

/** Glyph ids + positions in visual (left-to-right) order, font units. */
async function layoutRun(font: fontkit.Font, fontPath: string, text: string, shaper: Shaper): Promise<Placed[]> {
  if (shaper === "fontkit") {
    const run = font.layout(text, undefined, "arab", undefined, "rtl");
    return run.glyphs.map((g, i) => ({ gid: g.id, ...pick(run.positions[i]) }));
  }
  const hb = await import("harfbuzzjs");
  const face = new hb.Face(new hb.Blob(readFileSync(fontPath)));
  const hbFont = new hb.Font(face); // scale defaults to unitsPerEm
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties(); // Arabic script, RTL
  hb.shape(hbFont, buffer);
  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();
  // HarfBuzz output for RTL runs is already in visual order.
  return infos.map((info, i) => ({ gid: info.codepoint, ...pick(positions[i]) }));
}

const pick = (p: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number }) => ({
  xAdvance: p.xAdvance,
  yAdvance: p.yAdvance,
  xOffset: p.xOffset,
  yOffset: p.yOffset,
});

export async function shape(fontPath: string, text: string, shaper: Shaper = "harfbuzz"): Promise<Shaped> {
  const font = openFont(fontPath);
  const run = await layoutRun(font, fontPath, text, shaper);
  const pieces: { d: string; bbox: { minX: number; minY: number; maxX: number; maxY: number } }[] = [];
  let penX = 0;
  let penY = 0;
  for (const g of run) {
    const x = penX + g.xOffset;
    const y = penY + g.yOffset;
    // Font units are y-up; SVG is y-down: flip, then place.
    const p = font.getGlyph(g.gid).path.transform(1, 0, 0, -1, x, -y);
    if (p.commands.length) {
      const b = p.bbox;
      pieces.push({ d: round(p.toSVG()), bbox: { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY } });
    }
    penX += g.xAdvance;
    penY += g.yAdvance;
  }
  if (!pieces.length) throw new Error("No outlines produced; does the font cover this text?");
  const minX = Math.min(...pieces.map((p) => p.bbox.minX));
  const minY = Math.min(...pieces.map((p) => p.bbox.minY));
  const maxX = Math.max(...pieces.map((p) => p.bbox.maxX));
  const maxY = Math.max(...pieces.map((p) => p.bbox.maxY));
  // Pad by 1% of the em so strokes and antialiasing are not clipped.
  const pad = Math.ceil(font.unitsPerEm * 0.01);
  // Logical (reading) order = right-to-left visually, so data-i 0 is the rightmost glyph.
  const paths = pieces.map((p) => p.d).reverse();
  return {
    paths,
    viewBox: [Math.floor(minX) - pad, Math.floor(minY) - pad, Math.ceil(maxX - minX) + 2 * pad, Math.ceil(maxY - minY) + 2 * pad],
    unitsPerEm: font.unitsPerEm,
    glyphCount: run.length,
    fontName: font.fullName || font.postscriptName || basename(fontPath),
  };
}

function svgDoc(s: Shaped, text: string, mode: "fill" | "stroke"): string {
  const paint =
    mode === "fill"
      ? `fill="currentColor"`
      : `fill="none" stroke="currentColor" stroke-width="${Math.round(s.unitsPerEm / 110)}" stroke-linejoin="round" stroke-linecap="round"`;
  const body = s.paths.map((d, i) => `  <path class="g" data-i="${i}" d="${d}"/>`).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.viewBox.join(" ")}" ${paint} role="img" aria-label="${text}">\n<title>${text}</title>\n${body}\n</svg>\n`;
}

function iconDoc(s: Shaped): string {
  const [x, y, w, h] = s.viewBox;
  const side = Math.max(w, h) * 1.22;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ox = Math.round(cx - side / 2);
  const oy = Math.round(cy - side / 2);
  const S = Math.round(side);
  const body = s.paths.map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${S} ${S}"><rect x="${ox}" y="${oy}" width="${S}" height="${S}" rx="${Math.round(S * 0.22)}" fill="${LIMESTONE}"/><g fill="${INK}">${body}</g></svg>\n`;
}

function tsxModule(s: Shaped, text: string, name: string, fontPath: string): string {
  const id = name.replace(/[^a-z0-9]+(.)/gi, (_, c: string) => c.toUpperCase());
  return `// GENERATED by scripts/wordmark.ts. Do not edit; run \`pnpm brand --font <font>\`.
// Font: ${s.fontName} (${relative(process.cwd(), fontPath)})

export const ${id} = {
  text: ${JSON.stringify(text)},
  font: ${JSON.stringify(s.fontName)},
  viewBox: ${JSON.stringify(s.viewBox.join(" "))},
  width: ${s.viewBox[2]},
  height: ${s.viewBox[3]},
  /** Stroke width (font units) used by the draw-in variant. */
  strokeWidth: ${Math.round(s.unitsPerEm / 110)},
  /** One outline per glyph, in reading order (index 0 is the rightmost glyph). */
  paths: [
${s.paths.map((d) => `    ${JSON.stringify(d)},`).join("\n")}
  ],
} as const;
`;
}

function previewDoc(fontFile: string, upm: number, shaper: Shaper, entries: { text: string; svg: string }[]): string {
  const rows = entries
    .map(
      (e) => `<section><h2>SVG (${shaper} shaping, fontkit outlines)</h2><div class="svg">${e.svg}</div>
<h2>Browser text (same font via @font-face, HarfBuzz shaping)</h2><p class="text" lang="ar" dir="rtl">${e.text}</p></section>`,
    )
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Brand glyph preview</title>
<style>@font-face{font-family:Brand;src:url("${fontFile}")}body{margin:40px;background:${LIMESTONE};color:${INK};font:14px system-ui}
h2{font-size:12px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin:24px 0 8px}
section{border-bottom:1px solid #0002;padding-bottom:32px}.svg svg{height:auto;display:block}
.text{font-family:Brand;font-size:64px;line-height:2;margin:0;text-align:left}</style>${rows}
<script>/* same scale as the 64px text: width = viewBox width / unitsPerEm em */
document.querySelectorAll(".svg svg").forEach((s)=>{s.style.width=(s.viewBox.baseVal.width/${upm}*64)+"px"})</script>`;
}

async function generate(opts: {
  font: string;
  text: string;
  out: string | null;
  icon?: string;
  tsx: boolean;
  name?: string;
  shaper: Shaper;
}) {
  const s = await shape(opts.font, opts.text, opts.shaper);
  const written: string[] = [];
  const name = opts.name ?? (opts.out ? basename(opts.out, extname(opts.out)) : "glyphs");
  if (opts.out) {
    const out = resolve(opts.out);
    mkdirSync(dirname(out), { recursive: true });
    const stem = out.slice(0, -extname(out).length);
    writeFileSync(out, svgDoc(s, opts.text, "fill"));
    writeFileSync(`${stem}-stroke.svg`, svgDoc(s, opts.text, "stroke"));
    written.push(out, `${stem}-stroke.svg`);
    if (opts.tsx) {
      writeFileSync(`${stem}.tsx`, tsxModule(s, opts.text, name, resolve(opts.font)));
      written.push(`${stem}.tsx`);
    }
  }
  if (opts.icon) {
    mkdirSync(dirname(resolve(opts.icon)), { recursive: true });
    writeFileSync(resolve(opts.icon), iconDoc(s));
    written.push(resolve(opts.icon));
  }
  console.log(
    `${name}: ${s.fontName} [${opts.shaper}] | viewBox "${s.viewBox.join(" ")}" | ${s.glyphCount} glyphs, ${s.paths.length} outlines`,
  );
  for (const f of written) console.log(`  -> ${relative(process.cwd(), f)}`);
  return { s, svg: svgDoc(s, opts.text, "fill") };
}

async function main() {
  const { values } = parseArgs({
    options: {
      font: { type: "string" },
      text: { type: "string" },
      out: { type: "string" },
      icon: { type: "string" },
      all: { type: "boolean", default: false },
      "no-tsx": { type: "boolean", default: false },
      preview: { type: "string" },
      shaper: { type: "string", default: "harfbuzz" },
    },
  });
  if (!values.font) throw new Error("--font <path to .ttf/.otf> is required");
  const font = resolve(values.font);
  const tsx = !values["no-tsx"];
  const shaper = values.shaper as Shaper;
  if (shaper !== "harfbuzz" && shaper !== "fontkit") throw new Error("--shaper must be harfbuzz or fontkit");
  const results: { text: string; svg: string }[] = [];

  if (values.all) {
    for (const target of BRAND_TARGETS) {
      const { svg } = await generate({
        font,
        text: target.text,
        out: target.out,
        icon: "icon" in target ? target.icon : undefined,
        tsx,
        name: target.name,
        shaper,
      });
      results.push({ text: target.text, svg });
    }
  } else {
    if (!values.text || !values.out) throw new Error("--text and --out are required (or pass --all)");
    const { svg } = await generate({ font, text: values.text, out: values.out, icon: values.icon, tsx, shaper });
    results.push({ text: values.text, svg });
  }

  if (values.preview) {
    const dir = resolve(values.preview);
    mkdirSync(dir, { recursive: true });
    const fontFile = `preview-font${extname(font)}`;
    copyFileSync(font, join(dir, fontFile));
    writeFileSync(join(dir, "preview.html"), previewDoc(fontFile, openFont(font).unitsPerEm, shaper, results));
    console.log(`preview: ${join(dir, "preview.html")}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
