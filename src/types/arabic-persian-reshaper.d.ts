declare module "arabic-persian-reshaper" {
  /** Maps Arabic letters to their contextual Presentation Forms-B glyphs (logical order kept). */
  export const ArabicShaper: { convertArabic(input: string): string; convertArabicBack(input: string): string };
  export const PersianShaper: { convertArabic(input: string): string; convertArabicBack(input: string): string };
}
