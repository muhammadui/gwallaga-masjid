import "server-only";
import { prisma, type DonationPurpose } from "@/lib/db";

/**
 * Resolve which campaign (if any) a gift counts toward, and the purpose to
 * store:
 *   - An explicit ?campaign=slug gift uses that campaign; the stored purpose
 *     is the campaign's own purpose (e.g. UPKEEP), or CAMPAIGN for a bespoke
 *     appeal, so zakat/upkeep reporting stays accurate.
 *   - A tab gift (e.g. Ramadan Iftar) counts toward the first live campaign
 *     linked to that tab, so its progress bar moves.
 * Returns null when an explicit campaign is not found / not active.
 */
export async function resolveCampaignForGift(
  purpose: DonationPurpose,
  campaignSlug: string | undefined,
): Promise<{ purpose: DonationPurpose; campaignId: string | null } | null> {
  if (purpose === "CAMPAIGN" || campaignSlug) {
    if (!campaignSlug) return null;
    const c = await prisma.campaign.findFirst({
      where: { slug: campaignSlug, active: true },
      select: { id: true, purpose: true },
    });
    if (!c) return null;
    return { purpose: c.purpose, campaignId: c.id };
  }
  const linked = await prisma.campaign.findFirst({
    where: { purpose, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return { purpose, campaignId: linked?.id ?? null };
}

export function getActiveCampaigns() {
  return prisma.campaign.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, slug: true, title: true, description: true, purpose: true, targetKobo: true, raisedKobo: true },
  });
}
