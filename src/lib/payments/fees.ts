/**
 * Paystack Nigeria local-transaction pricing, in kobo:
 *   fee = 1.5% of amount + ₦100
 *   the ₦100 flat part is waived for amounts ≤ ₦2,500
 *   total fee is capped at ₦2,000
 * Percentage part is rounded UP to the next kobo (never under-estimate).
 */
export const PAYSTACK_PERCENT = 0.015;
export const PAYSTACK_FLAT_KOBO = 10_000; // ₦100
export const PAYSTACK_FLAT_WAIVER_THRESHOLD_KOBO = 250_000; // ₦2,500
export const PAYSTACK_FEE_CAP_KOBO = 200_000; // ₦2,000

function assertKobo(n: number, name: string) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`${name} must be a non-negative integer (kobo)`);
}

/** Fee Paystack deducts from a charge of `amountKobo`. */
export function paystackFeeKobo(amountKobo: number): number {
  assertKobo(amountKobo, "amountKobo");
  if (amountKobo === 0) return 0;
  const percent = Math.ceil(amountKobo * PAYSTACK_PERCENT);
  const flat = amountKobo > PAYSTACK_FLAT_WAIVER_THRESHOLD_KOBO ? PAYSTACK_FLAT_KOBO : 0;
  return Math.min(percent + flat, PAYSTACK_FEE_CAP_KOBO);
}

/** What the masjid receives after Paystack's fee on a charge of `chargeKobo`. */
export function netAfterFeesKobo(chargeKobo: number): number {
  return chargeKobo - paystackFeeKobo(chargeKobo);
}

/**
 * Smallest amount to charge so the masjid nets at least `netKobo` after fees
 * ("cover the fees"). Solved per pricing region (flat waived / flat applied /
 * capped) because net(charge) is not monotonic at the ₦2,500 waiver boundary;
 * within a region it is, so a closed-form guess plus a ±1 kobo walk is exact.
 */
export function grossUpForFees(netKobo: number): number {
  assertKobo(netKobo, "netKobo");
  if (netKobo === 0) return 0;

  const candidates: number[] = [];
  const T = PAYSTACK_FLAT_WAIVER_THRESHOLD_KOBO;

  const solveIn = (lo: number, hi: number, guess: number) => {
    let c = Math.max(lo, Math.min(hi, guess));
    while (c > lo && netAfterFeesKobo(c - 1) >= netKobo) c--;
    while (c <= hi && netAfterFeesKobo(c) < netKobo) c++;
    if (c <= hi && netAfterFeesKobo(c) >= netKobo) candidates.push(c);
  };

  // Region A: charge ≤ ₦2,500, no flat fee.
  solveIn(1, T, Math.ceil(netKobo / (1 - PAYSTACK_PERCENT)));
  // Region B: charge > ₦2,500, flat fee applies, below the cap.
  const capStart = capStartKobo();
  solveIn(T + 1, capStart - 1, Math.ceil((netKobo + PAYSTACK_FLAT_KOBO) / (1 - PAYSTACK_PERCENT)));
  // Region C: fee is capped, so net = charge − cap exactly.
  solveIn(capStart, Number.MAX_SAFE_INTEGER, netKobo + PAYSTACK_FEE_CAP_KOBO);

  return Math.min(...candidates);
}

/** Smallest charge (above the waiver threshold) whose fee hits the cap. */
function capStartKobo(): number {
  let c = Math.ceil((PAYSTACK_FEE_CAP_KOBO - PAYSTACK_FLAT_KOBO) / PAYSTACK_PERCENT);
  while (paystackFeeKobo(c - 1) >= PAYSTACK_FEE_CAP_KOBO) c--;
  while (paystackFeeKobo(c) < PAYSTACK_FEE_CAP_KOBO) c++;
  return c;
}

/** Convenience for "cover the fees" UIs: extra kobo the donor adds. */
export function feesToCoverKobo(netKobo: number): number {
  return grossUpForFees(netKobo) - netKobo;
}
