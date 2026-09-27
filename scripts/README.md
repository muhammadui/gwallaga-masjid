# scripts

## `wordmark.ts`: brand glyph pipeline

Turns Arabic text into SVG outlines in a given font, so the brand marks never
depend on a web font being loaded (and can be animated glyph by glyph).

Shaping (joining forms, ligatures such as Allah, harakat stacking) is done by
HarfBuzz (`harfbuzzjs`), the engine Chrome, Firefox and Safari use; outlines
come from `fontkit` by glyph id. fontkit's own `layout()` is kept behind
`--shaper fontkit` but collides stacked marks in Amiri (fatha over shadda), so
it is not the default.

### Swap the display font (one command)

```sh
pnpm brand --font path/to/ChosenFont.ttf
```

This regenerates everything that carries the Arabic mark:

| Output | Used by |
|---|---|
| `src/assets/brand/wordmark.svg`, `wordmark-stroke.svg`, `wordmark.tsx` | header wordmark, preloader (`wordmark.tsx` is imported; no loaders) |
| `src/assets/brand/bismillah.svg`, `bismillah-stroke.svg`, `bismillah.tsx` | available for the hero / certificate |
| `src/app/icon.svg` | favicon ("غوالاغا", ink on limestone) |

Then check it and commit:

```sh
pnpm brand --font path/to/ChosenFont.ttf --preview /tmp/brand-preview
# open /tmp/brand-preview/preview.html: SVG vs the same text via @font-face
```

The font file itself is not needed at runtime. The text for each target lives in
`BRAND_TARGETS` at the top of `wordmark.ts`.

### One-off strings

```sh
pnpm wordmark --font src/assets/fonts/Amiri-Regular.ttf \
  --text "مسجد غوالاغا الجامع" --out src/assets/brand/wordmark.svg
```

Writes `<out>.svg` (`fill="currentColor"`), `<out>-stroke.svg`
(`stroke="currentColor" fill="none"`) and `<out>.tsx`, and prints the viewBox
and glyph count. Every glyph is its own `<path class="g" data-i="n">`, in
reading order (index 0 is the rightmost glyph).

Options: `--icon <file.svg>` (square favicon), `--no-tsx`, `--shaper harfbuzz|fontkit`,
`--preview <dir>`.
