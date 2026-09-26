import { t } from "@/i18n/en";
import { formatNaira } from "@/lib/utils";
import { progressPercent } from "@/lib/donations/giving";

/** Hairline progress bar with tabular raised / target figures. */
export function CampaignProgress({ raisedKobo, targetKobo, label }: { raisedKobo: number; targetKobo: number; label: string }) {
  const pct = progressPercent(raisedKobo, targetKobo);
  const c = t.donate.campaigns;
  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="relative h-[3px] w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-indigo"
          style={{ width: `${Math.max(pct, raisedKobo > 0 ? 1 : 0)}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 tabular-nums">
        <p>
          <span className="font-display text-[1.5rem] leading-none">{formatNaira(raisedKobo)}</span>{" "}
          <span className="text-[0.8125rem] text-muted">
            {c.raised} {c.of} {formatNaira(targetKobo)}
          </span>
        </p>
        <p className="text-[0.8125rem] text-muted">
          {pct === 0 && raisedKobo > 0 ? "<1" : pct}% {c.funded}
        </p>
      </div>
    </div>
  );
}
