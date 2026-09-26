import type { BankAccount, SiteSettings } from "@/lib/db";
import { t } from "@/i18n/en";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

type Row = { label: string; value: string; copy?: boolean; mono?: boolean; emphasis?: boolean };

/** A hairline definition list with a copy button per value. */
export function DetailRows({ rows, className }: { rows: Row[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line hairline-y", className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
          <dt className="text-[0.8125rem] text-muted">{r.label}</dt>
          <dd className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "min-w-0 break-all text-right tabular-nums",
                r.mono && "font-mono text-[0.9375rem] tracking-[0.04em]",
                r.emphasis ? "font-display text-[1.5rem] leading-none" : "text-[0.9375rem] font-medium",
              )}
            >
              {r.value}
            </span>
            {r.copy ? <CopyButton value={r.value.replace(/\s+/g, r.mono ? "" : " ")} label={`${t.donate.transfer.copy} ${r.label.toLowerCase()}`} /> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Masjid account for transfers, or an office-contact fallback when none is set. */
export function BankDetails({
  account,
  site,
  extraRows = [],
  className,
}: {
  account: BankAccount | null;
  site: Pick<SiteSettings, "phone" | "whatsapp">;
  extraRows?: Row[];
  className?: string;
}) {
  const tr = t.donate.transfer;
  if (!account) {
    const contact: Row[] = [
      ...(site.phone ? [{ label: tr.officePhone, value: site.phone, copy: true }] : []),
      ...(site.whatsapp ? [{ label: tr.officeWhatsApp, value: site.whatsapp, copy: true }] : []),
    ];
    return (
      <div className={className}>
        <p className="font-display text-display-sm">{tr.noAccountTitle}</p>
        <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-muted">{tr.noAccountBody}</p>
        {extraRows.length + contact.length > 0 ? <DetailRows className="mt-6" rows={[...extraRows, ...contact]} /> : null}
      </div>
    );
  }
  return (
    <DetailRows
      className={className}
      rows={[
        { label: tr.bank, value: account.bankName },
        { label: tr.accountName, value: account.accountName, copy: true },
        { label: tr.accountNumber, value: account.accountNumber, copy: true, mono: true, emphasis: true },
        ...extraRows,
      ]}
    />
  );
}
