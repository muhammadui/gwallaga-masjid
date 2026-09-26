import { test } from "node:test";
import assert from "node:assert/strict";
import { csvEscape, toCsv } from "./csv";

test("csvEscape quotes commas, quotes and newlines", () => {
  assert.equal(csvEscape("plain"), "plain");
  assert.equal(csvEscape("Bello, Aisha"), '"Bello, Aisha"');
  assert.equal(csvEscape('He said "salam"'), '"He said ""salam"""');
  assert.equal(csvEscape("line1\nline2"), '"line1\nline2"');
  assert.equal(csvEscape("cr\r"), '"cr\r"');
});

test("csvEscape neutralises spreadsheet formulas in text only", () => {
  assert.equal(csvEscape("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvEscape("+2348031234567"), "'+2348031234567");
  assert.equal(csvEscape("-1"), "'-1");
  assert.equal(csvEscape("@cmd"), "'@cmd");
  assert.equal(csvEscape(-100), "-100");
});

test("csvEscape handles non-strings", () => {
  assert.equal(csvEscape(null), "");
  assert.equal(csvEscape(undefined), "");
  assert.equal(csvEscape(1500), "1500");
  assert.equal(csvEscape(Number.NaN), "");
  assert.equal(csvEscape(true), "true");
  assert.equal(csvEscape(new Date("2026-09-26T10:00:00Z")), "2026-09-26T10:00:00.000Z");
});

test("toCsv uses CRLF and a trailing newline", () => {
  assert.equal(toCsv(["a", "b"], [[1, "x,y"]]), 'a,b\r\n1,"x,y"\r\n');
});
