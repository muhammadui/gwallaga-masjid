"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { t } from "@/i18n/en";
import { prisma, Prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sendDonationReceipt } from "@/lib/donations/receipt";
import { slugify } from "@/lib/donations/giving";
import { bankAccountSchema, campaignSchema, fieldErrors } from "@/lib/validation/donation";

const a = t.donate.admin;

export type AdminFormState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message?: string; fieldErrors: Record<string, string>; values?: Record<string, string> };

function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

function revalidateGiving() {
  revalidatePath("/donate");
  revalidatePath("/", "layout");
  revalidatePath("/admin/donations", "layout");
  revalidatePath("/admin");
}

// ─── Bank transfers ─────────────────────────────────────────────────────────

/** Treasurer matched the reference on the statement: PENDING_TRANSFER → SUCCESS, campaign += amount, receipt. */
export async function confirmTransfer(donationId: string): Promise<void> {
  const { user } = await requireAdmin();
  const now = new Date();
  const settled = await prisma.$transaction(async (tx) => {
    const d = await tx.donation.findUnique({
      where: { id: donationId },
      select: { reference: true, amountKobo: true, campaignId: true },
    });
    if (!d) return null;
    const { count } = await tx.donation.updateMany({
      where: { id: donationId, status: "PENDING_TRANSFER" },
      data: {
        status: "SUCCESS",
        paidAt: now,
        channel: "bank_transfer",
        raw: { confirmedBy: user.id, confirmedByEmail: user.email, confirmedAt: now.toISOString() } as Prisma.InputJsonValue,
      },
    });
    if (count === 0) return null;
    if (d.campaignId) {
      await tx.campaign.update({ where: { id: d.campaignId }, data: { raisedKobo: { increment: d.amountKobo } } });
    }
    return d.reference;
  });
  if (settled) await sendDonationReceipt(settled);
  revalidateGiving();
  redirect(`/admin/donations?notice=${settled ? "confirmed" : "handled"}#pending`);
}

/** Transfer never arrived. Only PENDING_TRANSFER rows can be failed here. */
export async function markTransferFailed(donationId: string): Promise<void> {
  const { user } = await requireAdmin();
  const { count } = await prisma.donation.updateMany({
    where: { id: donationId, status: "PENDING_TRANSFER" },
    data: {
      status: "FAILED",
      raw: { markedFailedBy: user.id, markedFailedAt: new Date().toISOString() } as Prisma.InputJsonValue,
    },
  });
  revalidateGiving();
  redirect(`/admin/donations?notice=${count ? "failed" : "handled"}#pending`);
}

// ─── Campaigns ──────────────────────────────────────────────────────────────

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "campaign";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const clash = await prisma.campaign.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function saveCampaign(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin(["ADMIN"]);
  const parsed = campaignSchema.safeParse({
    id: formData.get("id") ?? undefined,
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? undefined,
    description: formData.get("description") ?? "",
    targetNaira: String(formData.get("targetNaira") ?? "").replace(/[₦,\s]/g, ""),
    purpose: formData.get("purpose") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
    active: formData.get("active") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values: formValues(formData) };
  const v = parsed.data;

  const data = {
    title: v.title,
    description: v.description,
    targetKobo: v.targetNaira * 100,
    purpose: v.purpose,
    sortOrder: v.sortOrder,
    active: v.active,
  };

  try {
    if (v.id) {
      const slug = v.slug ?? undefined;
      if (slug) {
        const clash = await prisma.campaign.findFirst({ where: { slug, NOT: { id: v.id } }, select: { id: true } });
        if (clash) return { status: "error", fieldErrors: { slug: a.errors.slugTaken }, values: formValues(formData) };
      }
      await prisma.campaign.update({ where: { id: v.id }, data: { ...data, ...(slug ? { slug } : {}) } });
    } else {
      let slug: string;
      if (v.slug) {
        const clash = await prisma.campaign.findUnique({ where: { slug: v.slug }, select: { id: true } });
        if (clash) return { status: "error", fieldErrors: { slug: a.errors.slugTaken }, values: formValues(formData) };
        slug = v.slug;
      } else {
        slug = await uniqueSlug(slugify(v.title));
      }
      await prisma.campaign.create({ data: { ...data, slug } });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { status: "error", fieldErrors: { slug: a.errors.slugTaken }, values: formValues(formData) };
    }
    throw e;
  }

  revalidateGiving();
  return { status: "ok", message: a.saved };
}

export async function toggleCampaign(campaignId: string, active: boolean): Promise<void> {
  await requireAdmin(["ADMIN"]);
  await prisma.campaign.update({ where: { id: campaignId }, data: { active } });
  revalidateGiving();
}

// ─── Bank account ───────────────────────────────────────────────────────────

export async function saveBankAccount(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin(["ADMIN"]);
  const parsed = bankAccountSchema.safeParse({
    bankName: formData.get("bankName") ?? "",
    accountName: formData.get("accountName") ?? "",
    accountNumber: formData.get("accountNumber") ?? "",
    active: formData.get("active") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values: formValues(formData) };
  const v = parsed.data;

  await prisma.$transaction(async (tx) => {
    const current = await tx.bankAccount.findFirst({ orderBy: [{ active: "desc" }, { updatedAt: "desc" }], select: { id: true } });
    const row = current
      ? await tx.bankAccount.update({ where: { id: current.id }, data: v, select: { id: true } })
      : await tx.bankAccount.create({ data: v, select: { id: true } });
    // One account is shown publicly at a time.
    if (v.active) await tx.bankAccount.updateMany({ where: { NOT: { id: row.id } }, data: { active: false } });
  });

  revalidateGiving();
  return { status: "ok", message: a.saved };
}
