import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n/en";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { toggleCampaign } from "@/actions/donation";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { CampaignProgress } from "@/components/donate/progress";
import { BankAccountForm, CampaignForm } from "./forms";

const a = t.donate.admin;

export const metadata: Metadata = { title: a.campaignsTitle };

export default async function CampaignsAdminPage() {
  await requireAdmin(["ADMIN"]);
  const [campaigns, account] = await Promise.all([
    prisma.campaign.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.bankAccount.findFirst({ orderBy: [{ active: "desc" }, { updatedAt: "desc" }] }),
  ]);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/donations" className="text-[0.8125rem] text-muted underline underline-offset-4">
        ← {a.donationsLink}
      </Link>
      <div className="mt-6">
        <Eyebrow>{a.eyebrow}</Eyebrow>
        <Heading as="h1" size="md" className="mt-5">
          {a.campaignsTitle}
        </Heading>
        <p className="mt-4 max-w-2xl text-[0.9375rem] text-muted">{a.campaignsLede}</p>
      </div>

      <ul className="mt-12 divide-y divide-line hairline-y">
        {campaigns.map((c) => (
          <li key={c.id} className="py-7">
            <div className="grid gap-5 md:grid-cols-[1fr_16rem] md:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-[1.5rem] leading-tight">{c.title}</h2>
                  <span
                    className={
                      c.active
                        ? "inline-flex h-6 items-center rounded-full bg-indigo px-2.5 text-[0.75rem] text-limestone"
                        : "inline-flex h-6 items-center rounded-full px-2.5 text-[0.75rem] text-muted ring-1 ring-inset ring-line-strong"
                    }
                  >
                    {c.active ? a.active : a.inactive}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[0.8125rem] text-muted">/donate?campaign={c.slug}</p>
                <p className="mt-1 text-[0.8125rem] text-muted">
                  {a.campaignPurpose}: {t.donate.purposes[c.purpose]}
                </p>
              </div>
              <CampaignProgress raisedKobo={c.raisedKobo} targetKobo={c.targetKobo} label={c.title} />
            </div>
            <div className="mt-5 flex flex-wrap items-start gap-3">
              <form action={toggleCampaign.bind(null, c.id, !c.active)}>
                <Button type="submit" size="sm" variant="secondary">
                  {c.active ? a.deactivate : a.activate}
                </Button>
              </form>
              <details className="group open:w-full">
                <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-full px-4 text-[0.8125rem] ring-1 ring-inset ring-line-strong hover:bg-ink/[0.04]">
                  {a.editCampaign}
                </summary>
                <div className="mt-6 rounded-[1.5rem] bg-surface p-6 ring-1 ring-line">
                  <CampaignForm
                    campaign={{
                      id: c.id,
                      title: c.title,
                      slug: c.slug,
                      description: c.description,
                      targetKobo: c.targetKobo,
                      purpose: c.purpose,
                      sortOrder: c.sortOrder,
                      active: c.active,
                    }}
                  />
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>

      <section aria-labelledby="new-campaign" className="mt-14">
        <h2 id="new-campaign" className="font-display text-display-sm">
          {a.newCampaign}
        </h2>
        <div className="mt-6 rounded-[1.5rem] bg-surface p-6 ring-1 ring-line sm:p-8">
          <CampaignForm />
        </div>
      </section>

      <section aria-labelledby="bank-title" className="mt-20">
        <h2 id="bank-title" className="font-display text-display-sm">
          {a.bankTitle}
        </h2>
        <p className="mt-2 text-[0.875rem] text-muted">{a.bankLede}</p>
        <div className="mt-6 rounded-[1.5rem] bg-surface p-6 ring-1 ring-line sm:p-8">
          <BankAccountForm
            account={account ? { bankName: account.bankName, accountName: account.accountName, accountNumber: account.accountNumber, active: account.active } : null}
          />
        </div>
      </section>
    </div>
  );
}
