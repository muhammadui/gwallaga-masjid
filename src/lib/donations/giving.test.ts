import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNairaInput, parsePurposeParam, perDayKobo, progressPercent, slugify } from "./giving";

test("perDayKobo: yearly total over 365 days, whole naira", () => {
  assert.equal(perDayKobo(500_000), 16_400); // ₦5,000/month → ₦164/day
  assert.equal(perDayKobo(100_000), 3_300); // ₦1,000 → ₦33
  assert.equal(perDayKobo(10_000_000), 328_800); // ₦100,000 → ₦3,288
  assert.equal(perDayKobo(10_000), 300); // ₦100 → ₦3
  assert.equal(perDayKobo(1_000), 100); // never below ₦1
  assert.equal(perDayKobo(0), 0);
  assert.equal(perDayKobo(-5), 0);
  assert.equal(perDayKobo(Number.NaN), 0);
});

test("parseNairaInput", () => {
  assert.equal(parseNairaInput("5,000"), 5000);
  assert.equal(parseNairaInput("₦ 20 000"), 20000);
  assert.equal(parseNairaInput("12.5"), null);
  assert.equal(parseNairaInput(""), null);
  assert.equal(parseNairaInput("-3"), null);
});

test("parsePurposeParam", () => {
  assert.equal(parsePurposeParam("zakat"), "ZAKAT");
  assert.equal(parsePurposeParam("ORPHANS"), "ORPHANS");
  assert.equal(parsePurposeParam(["masjid-upkeep"]), "UPKEEP");
  assert.equal(parsePurposeParam("campaign"), null);
  assert.equal(parsePurposeParam(undefined), null);
});

test("slugify and progress", () => {
  assert.equal(slugify("Ramadan Iftar 1448!"), "ramadan-iftar-1448");
  assert.equal(slugify("  Orphans' Welfare — Fund  "), "orphans-welfare-fund");
  assert.equal(slugify("Ɗakin Ƙofa na Masallaci"), "dakin-kofa-na-masallaci"); // Hausa hooked letters
  assert.equal(progressPercent(50, 200), 25);
  assert.equal(progressPercent(500, 200), 100);
  assert.equal(progressPercent(1, 0), 0);
});
