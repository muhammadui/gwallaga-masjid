-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'REGISTRAR');

-- CreateEnum
CREATE TYPE "NikahStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'SOLEMNIZED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SadakiStatus" AS ENUM ('PAID', 'DEFERRED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'SERVICEFABRIC', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "DonationPurpose" AS ENUM ('SADAQAH', 'ZAKAT', 'UPKEEP', 'IFTAR', 'ORPHANS', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "DonationFrequency" AS ENUM ('ONE_OFF', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'PENDING_TRANSFER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'REGISTRAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "masjidName" TEXT NOT NULL DEFAULT 'Gwallaga Juma''at Masjid',
    "address" TEXT NOT NULL DEFAULT 'Gwallaga, Murtala Muhammad Way, Bauchi',
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "nikahFeeKobo" INTEGER NOT NULL DEFAULT 1500000,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "fajrIqamahOffset" INTEGER NOT NULL DEFAULT 25,
    "dhuhrIqamahOffset" INTEGER NOT NULL DEFAULT 15,
    "asrIqamahOffset" INTEGER NOT NULL DEFAULT 15,
    "maghribIqamahOffset" INTEGER NOT NULL DEFAULT 5,
    "ishaIqamahOffset" INTEGER NOT NULL DEFAULT 15,
    "jumuahFirst" TEXT NOT NULL DEFAULT '13:30',
    "jumuahSecond" TEXT,
    "hijriOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "calculationMethod" TEXT NOT NULL DEFAULT 'Egyptian',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NikahSlot" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NikahSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NikahBooking" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "status" "NikahStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "slotLabel" TEXT NOT NULL,
    "slotId" TEXT,
    "groomName" TEXT NOT NULL,
    "groomPhone" TEXT NOT NULL,
    "groomEmail" TEXT,
    "groomAddress" TEXT NOT NULL,
    "groomAge" INTEGER NOT NULL,
    "brideName" TEXT NOT NULL,
    "bridePhone" TEXT,
    "brideEmail" TEXT,
    "brideAddress" TEXT NOT NULL,
    "brideAge" INTEGER NOT NULL,
    "waliName" TEXT NOT NULL,
    "waliRelationship" TEXT NOT NULL,
    "waliPhone" TEXT NOT NULL,
    "witness1Name" TEXT NOT NULL,
    "witness1Phone" TEXT NOT NULL,
    "witness2Name" TEXT NOT NULL,
    "witness2Phone" TEXT NOT NULL,
    "sadakiAmountKobo" INTEGER NOT NULL,
    "sadakiStatus" "SadakiStatus" NOT NULL,
    "notes" TEXT,
    "feeKobo" INTEGER NOT NULL,
    "checklist" JSONB,
    "officiantName" TEXT,
    "solemnizedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NikahBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "reference" TEXT NOT NULL,
    "providerRef" TEXT,
    "amountKobo" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "channel" TEXT,
    "raw" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "pdf" BYTEA NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "purpose" "DonationPurpose" NOT NULL,
    "campaignId" TEXT,
    "amountKobo" INTEGER NOT NULL,
    "feesCoveredKobo" INTEGER NOT NULL DEFAULT 0,
    "frequency" "DonationFrequency" NOT NULL DEFAULT 'ONE_OFF',
    "donorName" TEXT,
    "donorEmail" TEXT,
    "donorPhone" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'INITIATED',
    "channel" TEXT,
    "paystackPlanCode" TEXT,
    "paystackSubscriptionCode" TEXT,
    "paystackEmailToken" TEXT,
    "paidAt" TIMESTAMP(3),
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purpose" "DonationPurpose" NOT NULL DEFAULT 'CAMPAIGN',
    "targetKobo" INTEGER NOT NULL,
    "raisedKobo" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "coverImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaystackPlan" (
    "id" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "interval" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaystackPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "NikahSlot_weekday_time_key" ON "NikahSlot"("weekday", "time");

-- CreateIndex
CREATE UNIQUE INDEX "NikahBooking_bookingRef_key" ON "NikahBooking"("bookingRef");

-- CreateIndex
CREATE INDEX "NikahBooking_status_idx" ON "NikahBooking"("status");

-- CreateIndex
CREATE INDEX "NikahBooking_scheduledAt_idx" ON "NikahBooking"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_bookingId_key" ON "Certificate"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNo_key" ON "Certificate"("certificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_reference_key" ON "Donation"("reference");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE INDEX "Donation_purpose_idx" ON "Donation"("purpose");

-- CreateIndex
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");

-- CreateIndex
CREATE INDEX "Donation_paystackSubscriptionCode_idx" ON "Donation"("paystackSubscriptionCode");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackPlan_planCode_key" ON "PaystackPlan"("planCode");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackPlan_amountKobo_interval_key" ON "PaystackPlan"("amountKobo", "interval");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NikahBooking" ADD CONSTRAINT "NikahBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "NikahSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "NikahBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "NikahBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
