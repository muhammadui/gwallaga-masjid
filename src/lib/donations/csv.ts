/**
 * Minimal RFC 4180 CSV writer with spreadsheet formula-injection protection.
 * Donor-entered text can start with "=", "+", "-", "@" (or tab/CR), which
 * Excel/Sheets would evaluate; such strings are prefixed with a single quote.
 */

export type CsvValue = string | number | boolean | Date | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvEscape(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (typeof value === "number") s = Number.isFinite(value) ? String(value) : "";
  else if (typeof value === "boolean") s = value ? "true" : "false";
  else {
    s = value;
    if (FORMULA_START.test(s)) s = `'${s}`;
  }
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(values: CsvValue[]): string {
  return values.map(csvEscape).join(",");
}

/** Full document with CRLF line endings (what Excel expects). */
export function toCsv(header: string[], rows: CsvValue[][]): string {
  return [csvRow(header), ...rows.map(csvRow)].join("\r\n") + "\r\n";
}
